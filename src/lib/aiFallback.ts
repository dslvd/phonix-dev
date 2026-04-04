import { vocabularyData } from '../data/vocabulary';

export interface FallbackScanResult {
  object: string;
  translation: string;
  confidence: 'smart-assist' | 'match';
}

export interface AIChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export class AIRequestError extends Error {
  code: string;
  status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'AIRequestError';
    this.code = code;
    this.status = status;
  }
}

const normalize = (value: string) => value.toLowerCase().trim();
const stripEmoji = (value: string) =>
  value
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`request-failed:${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function callGeminiBrowser(prompt: string, apiKey: string) {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${prompt}\n\nRespond in plain text only. Do not use markdown, bold, or formatting.`,
              },
            ],
          },
        ],
      }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error('Gemini browser error:', data);
    if (response.status === 429) {
      throw new AIRequestError(
        'rate_limited',
        'Gemini is rate-limited right now. Wait a bit or switch to a different API key/project.',
        429
      );
    }

    throw new AIRequestError(
      'request_failed',
      data?.error?.message || `Gemini request failed with status ${response.status}.`,
      response.status
    );
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new AIRequestError('no_text_returned', 'Gemini returned no text.');
  }

  return text.replace(/\*\*/g, '');
}

async function callGeminiWithBackup(prompt: string, apiKeys: string[]) {
  let lastError: unknown = null;

  for (let index = 0; index < apiKeys.length; index += 1) {
    const apiKey = apiKeys[index];

    try {
      return await callGeminiBrowser(prompt, apiKey);
    } catch (error) {
      lastError = error;

      const shouldTryNextKey =
        error instanceof AIRequestError &&
        error.code === 'rate_limited' &&
        index < apiKeys.length - 1;

      if (shouldTryNextKey) {
        console.warn('Primary Gemini key is rate-limited, trying backup Gemini key.');
        continue;
      }

      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new AIRequestError('all_ai_paths_failed', 'All Gemini browser keys failed.');
}

function buildAssistantPrompt(
  query: string,
  targetLanguage: string,
  history: AIChatTurn[] = [],
  pageContext = '',
  responseLanguage = 'English'
) {
  const conversation = history
    .slice(-6)
    .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.text}`)
    .join('\n');

  return [
    'You are a concise Filipino language tutor.',
    `The target language is ${targetLanguage}.`,
    `The learner's preferred response language is ${responseLanguage}.`,
    'Answer naturally, briefly, and clearly.',
    'Do not use emojis.',
    `For normal conversation and app guidance, respond in ${responseLanguage}.`,
    'If the user asks about what to do in the app, answer using the current page context.',
    'Be conversational when the user is chatting casually.',
    `When the user asks for a translation, translate it clearly and briefly, but keep the explanation in ${responseLanguage}.`,
    'For translation questions, prefer short natural replies such as "You can say pwerta." or "\"Ano ini?\" means \"What is this?\""',
    `Do not switch away from ${responseLanguage} unless the user explicitly asks for another language or asks for a translation example.`,
    'If the current app context says the learner is in quiz mode, never reveal the exact quiz answer or the correct choice.',
    'In quiz mode, only give clues, nudges, elimination hints, pronunciation hints, or category-based hints.',
    'Keep explanations short unless the user asks for more detail.',
    'If there is recent conversation, use it to stay on topic.',
    pageContext ? `Current app context:\n${pageContext}` : '',
    conversation ? `Recent conversation:\n${conversation}` : '',
    `User question: ${query}`,
  ].join('\n');
}

export function findVocabularyMatch(query: string) {
  const normalizedQuery = normalize(query);

  return vocabularyData.find((item) => {
    const english = normalize(item.englishWord);
    const native = normalize(item.nativeWord);
    const category = normalize(item.category);

    return (
      english === normalizedQuery ||
      native === normalizedQuery ||
      english.includes(normalizedQuery) ||
      normalizedQuery.includes(english) ||
      native.includes(normalizedQuery) ||
      normalizedQuery.includes(native) ||
      category === normalizedQuery
    );
  });
}

export function generateFallbackAIAnswer(
  query: string,
  _targetLanguage: string,
  responseLanguage = 'English',
  pageContext = ''
) {
  const normalizedQuery = normalize(query);
  const directMatch = findVocabularyMatch(query);
  const isFilipino = normalize(responseLanguage) === 'filipino';
  const inQuizMode = normalize(pageContext).includes('quiz mode');
  const reply = (english: string, filipino: string) => (isFilipino ? filipino : english);

  if (inQuizMode) {
    return reply(
      'I will only give a clue: look at the picture, compare the choices, and rule out the words that do not match the object or category.',
      'Clue lang ibibigay ko: tingnan ang larawan, ihambing ang mga pagpipilian, at alisin ang mga salitang hindi tugma sa bagay o kategorya.'
    );
  }

  if (directMatch) {
    return reply(`You can say "${directMatch.nativeWord}".`, `Pwede mo sabihin ang "${directMatch.nativeWord}".`);
  }

  if (normalizedQuery === 'hello' || normalizedQuery === 'hi' || normalizedQuery === 'hey') {
    return reply('Hello. In Hiligaynon, you can say "Kumusta."', 'Hello. Sa Hiligaynon, puwede mong sabihin ang "Kumusta."');
  }

  if (normalizedQuery.includes('how are you')) {
    return reply('You can say "Kumusta ka?"', 'Puwede mong sabihin ang "Kumusta ka?"');
  }

  if (normalizedQuery.includes('thank you')) {
    return reply('You can say "Salamat."', 'Puwede mong sabihin ang "Salamat."');
  }

  if (
    normalizedQuery.includes('buy battery') ||
    normalizedQuery.includes('get battery') ||
    normalizedQuery.includes('more battery') ||
    normalizedQuery.includes('battery ulit') ||
    normalizedQuery.includes('magka-battery') ||
    normalizedQuery.includes('paano magka-battery') ||
    normalizedQuery.includes('ubos ang battery') ||
    normalizedQuery.includes('walang battery')
  ) {
    return reply(
      'Open the Premium page if you want more batteries right away. Premium gives you unlimited batteries.',
      'Buksan ang Premium page kung gusto mo ng battery agad. Ang premium ay may unlimited batteries.'
    );
  }

  if (normalizedQuery.includes('xp')) {
    return reply(
      'XP shows your learning progress in the app.',
      'Ang XP ay nagpapakita ng progreso mo sa app.'
    );
  }

  if (normalizedQuery.includes('what is this')) {
    return reply('"Ano ini?" is a natural way to ask that.', '"Ano ini?" ang natural na paraan para itanong iyan.');
  }

  if (normalizedQuery.includes('hello') || normalizedQuery.includes('greeting')) {
    return reply('A common greeting is "Kumusta."', 'Karaniwang bati ang "Kumusta."');
  }

  if (normalizedQuery.includes('count') || normalizedQuery.includes('number')) {
    return reply('Start with isa, duha, tatlo, apat, lima.', 'Magsimula sa isa, duha, tatlo, apat, lima.');
  }

  if (normalizedQuery.includes('animal')) {
    const animals = vocabularyData
      .filter((item) => item.category === 'animals')
      .slice(0, 4)
      .map((item) => `${item.englishWord} = ${item.nativeWord}`)
      .join('\n');

    return reply(`Here are a few animal words:\n${animals}`, `Narito ang ilang salitang hayop:\n${animals}`);
  }

  if (normalizedQuery.includes('food')) {
    const foods = vocabularyData
      .filter((item) => item.category === 'food')
      .slice(0, 4)
      .map((item) => `${item.englishWord} = ${item.nativeWord}`)
      .join('\n');

    return reply(`Here are a few food words:\n${foods}`, `Narito ang ilang salitang pagkain:\n${foods}`);
  }

  const suggestions = vocabularyData
    .slice(0, 3)
    .map((item) => `${item.englishWord} -> ${item.nativeWord}`)
    .join('\n');

  return reply(
    `Ask about a word, phrase, greeting, or counting.\n\nExamples:\n${suggestions}`,
    `Magtanong tungkol sa salita, parirala, bati, o pagbibilang.\n\nExamples:\n${suggestions}`
  );
}

export function getFallbackScanResult(label: string, targetLanguage: string): FallbackScanResult | null {
  const match = findVocabularyMatch(label);

  if (match) {
    return {
      object: match.englishWord,
      translation: match.nativeWord,
      confidence: 'match',
    };
  }

  const cleanedLabel = label.trim();
  if (!cleanedLabel) {
    return null;
  }

  return {
    object: cleanedLabel,
    translation: `${cleanedLabel} (${targetLanguage})`,
    confidence: 'smart-assist',
  };
}

export async function askCloudAI(
  query: string,
  targetLanguage = 'Hiligaynon',
  history: AIChatTurn[] = [],
  pageContext = '',
  responseLanguage = 'English'
) {
  const prompt = buildAssistantPrompt(query, targetLanguage, history, pageContext, responseLanguage);
  const browserApiKeys = [
    import.meta.env.VITE_GEMINI_API_KEY,
    import.meta.env.VITE_GEMINI_API_KEY_BACKUP,
  ].filter(Boolean) as string[];
  const isLocalDev =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (browserApiKeys.length > 0) {
    try {
      return stripEmoji(await callGeminiWithBackup(prompt, browserApiKeys));
    } catch (error) {
      if (error instanceof AIRequestError && error.code === 'rate_limited' && isLocalDev) {
        throw error;
      }

      console.warn('Gemini browser request failed, trying server AI route.', error);
    }
  }

  if (!isLocalDev) {
    try {
      const apiResponse = await postJson<{ text?: string }>('/api/ai', { prompt });
      if (apiResponse.text) {
        return stripEmoji(apiResponse.text.replace(/\*\*/g, ''));
      }
    } catch (error) {
      console.warn('Server AI route unavailable.', error);
    }
  }

  if (browserApiKeys.length === 0) {
    throw new AIRequestError(
      'missing_api_key',
      'Missing VITE_GEMINI_API_KEY or VITE_GEMINI_API_KEY_BACKUP.'
    );
  }

  throw new AIRequestError('all_ai_paths_failed', 'All AI paths failed.');
}

export async function analyzeImageWithAI(base64Data: string, targetLanguage: string) {
  try {
    const apiResponse = await postJson<{ text?: string }>('/api/vision', {
      image: base64Data,
      targetLanguage,
    });

    if (apiResponse.text) {
      return apiResponse.text.replace(/\*\*/g, '');
    }
  } catch (error) {
    console.warn('Server vision route unavailable, falling back to browser request.', error);
  }

  const apiKeys = [
    import.meta.env.VITE_GEMINI_API_KEY,
    import.meta.env.VITE_GEMINI_API_KEY_BACKUP,
  ].filter(Boolean) as string[];

  if (apiKeys.length === 0) {
    throw new Error('missing-api-key');
  }

  let lastError: unknown = null;

  for (let index = 0; index < apiKeys.length; index += 1) {
    const apiKey = apiKeys[index];

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Identify the main object in this image in English. Then translate it to ${targetLanguage}. Format exactly: Object: [name] | Translation: [${targetLanguage} word]. Keep it simple and concise. Respond in plain text only. Do not use markdown, bold, or formatting.`,
                },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error('Gemini vision browser error:', data);
      lastError = new Error(`request-failed:${response.status}`);

      if (response.status === 429 && index < apiKeys.length - 1) {
        console.warn('Primary Gemini key is rate-limited for vision, trying backup Gemini key.');
        continue;
      }

      throw lastError;
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      lastError = new Error('no-text-returned');
      break;
    }

    return text.replace(/\*\*/g, '');
  }

  throw lastError instanceof Error ? lastError : new Error('all-vision-paths-failed');
}
