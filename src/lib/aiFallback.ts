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

function getVertexModelUrl(apiKey: string, model = 'gemini-2.5-pro') {
  const project =
    import.meta.env.VITE_VERTEX_AI_PROJECT_ID ||
    import.meta.env.VITE_GOOGLE_CLOUD_PROJECT ||
    '';
  const location =
    import.meta.env.VITE_VERTEX_AI_LOCATION ||
    import.meta.env.VITE_GOOGLE_CLOUD_LOCATION ||
    'global';

  if (!project) {
    throw new AIRequestError(
      'missing_vertex_project',
      'Missing VITE_VERTEX_AI_PROJECT_ID or VITE_GOOGLE_CLOUD_PROJECT.'
    );
  }

  return `https://aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent?key=${apiKey}`;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message =
      (typeof errorData?.error === 'string' && errorData.error) ||
      (typeof errorData?.details === 'string' && errorData.details) ||
      `request-failed:${response.status}`;

    throw new AIRequestError('server_route_failed', message, response.status);
  }

  return response.json() as Promise<T>;
}

async function callGeminiBrowser(prompt: string, apiKey: string) {
  const response = await fetch(
    getVertexModelUrl(apiKey),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
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

async function callGeminiSingle(prompt: string, apiKey: string) {
  return callGeminiBrowser(prompt, apiKey);
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
    'You are Pippin, a warm, concise Filipino language tutor and app guide.',
    `The target language is ${targetLanguage}.`,
    `The learner's preferred response language is ${responseLanguage}.`,
    'Answer naturally, briefly, and clearly.',
    'Sound like a supportive human teacher, not a dictionary or robot.',
    'When the user greets you or starts a casual conversation, introduce yourself as Pippin in a natural way, like "Hello, I\'m Pippin..." before continuing.',
    'Do not use emojis.',
    `For normal conversation and app guidance, respond in ${responseLanguage}.`,
    'If the user asks about what to do in the app, answer using the current page context.',
    'Be conversational when the user is chatting casually.',
    'When teaching a word or phrase, prefer a natural short explanation or hint over a stiff formula.',
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
    return reply(
      'Hello, I\'m Pippin. In Hiligaynon, you can say "Kamusta."',
      'Hello, ako si Pippin. Sa Hiligaynon, puwede mong sabihin ang "Kamusta."'
    );
  }

  if (normalizedQuery.includes('how are you')) {
    return reply('You can say "Kamusta ka?"', 'Puwede mong sabihin ang "Kamusta ka?"');
  }

  if (normalizedQuery.includes('thank you')) {
    return reply('You can say "Salamat."', 'Puwede mong sabihin ang "Salamat."');
  }

  const asksAboutBattery =
    normalizedQuery.includes('buy battery') ||
    normalizedQuery.includes('get battery') ||
    normalizedQuery.includes('more battery') ||
    normalizedQuery.includes('battery ulit') ||
    normalizedQuery.includes('magka-battery') ||
    normalizedQuery.includes('paano magka-battery') ||
    normalizedQuery.includes('ubos ang battery') ||
    normalizedQuery.includes('walang battery') ||
    normalizedQuery.includes('recharge') ||
    normalizedQuery.includes('rechargable') ||
    normalizedQuery.includes('rechargeable') ||
    normalizedQuery.includes('refill') ||
    normalizedQuery.includes('charge again') ||
    normalizedQuery.includes('come back') ||
    normalizedQuery.includes('nagre-recharge') ||
    normalizedQuery.includes('nag rerecharge') ||
    normalizedQuery.includes('nagri-recharge') ||
    normalizedQuery.includes('bumabalik ang battery') ||
    normalizedQuery.includes('bumabalik ba ang battery');

  if (asksAboutBattery) {
    const normalizedContext = normalize(pageContext);
    const hasUnlimited = normalizedContext.includes('premium user') || normalizedContext.includes('unlimited batteries');
    const hasCountdown = normalizedContext.includes('battery refill timer');

    if (hasUnlimited) {
      return reply(
        'You already have unlimited batteries with Premium, so you can keep learning anytime.',
        'May unlimited batteries ka na sa Premium, kaya puwede kang magpatuloy kahit kailan.'
      );
    }

    if (hasCountdown) {
      return reply(
        'Yes. Free batteries recharge automatically after a short wait. If you want to keep going right away, open Premium for unlimited batteries.',
        'Oo. Ang libreng batteries ay kusang nagre-recharge pagkatapos ng kaunting hintay. Kung gusto mong magpatuloy agad, buksan ang Premium para sa unlimited batteries.'
      );
    }

    return reply(
      'Yes. Free batteries recharge automatically after a while. If you want more right away, open the Premium page for unlimited batteries.',
      'Oo. Ang libreng batteries ay kusang nagre-recharge pagkalipas ng ilang oras. Kung gusto mo ng dagdag agad, buksan ang Premium page para sa unlimited batteries.'
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
    return reply('A common greeting is "Kamusta."', 'Karaniwang bati ang "Kamusta."');
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
  const browserApiKey = import.meta.env.VITE_VERTEX_AI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  let browserError: unknown = null;
  let serverError: unknown = null;

  if (browserApiKey) {
    try {
      return stripEmoji(await callGeminiSingle(prompt, browserApiKey));
    } catch (error) {
      browserError = error;
      console.warn('Gemini browser request failed, trying server AI route.', error);
    }
  }

  try {
    const apiResponse = await postJson<{ text?: string }>('/api/ai', { prompt });
    if (apiResponse.text) {
      return stripEmoji(apiResponse.text.replace(/\*\*/g, ''));
    }
  } catch (error) {
    serverError = error;
    console.warn('Server AI route unavailable.', error);
  }

  const serverMissingProvider =
    serverError instanceof AIRequestError &&
    /No AI provider configured/i.test(serverError.message || '');

  if (!browserApiKey && serverMissingProvider) {
    throw new AIRequestError(
      'missing_api_key',
      'Missing AI keys. Configure VITE_VERTEX_AI_API_KEY or VITE_GEMINI_API_KEY for browser calls, or VERTEX_AI_API_KEY / GEMINI_API_KEY on the server /api/ai runtime.'
    );
  }

  if (!browserApiKey && !serverError) {
    throw new AIRequestError(
      'missing_api_key',
      'Missing VITE_VERTEX_AI_API_KEY or VITE_GEMINI_API_KEY.'
    );
  }

  if (serverError instanceof AIRequestError) {
    throw new AIRequestError(
      serverError.code,
      serverError.message,
      serverError.status
    );
  }

  if (browserError instanceof AIRequestError) {
    throw browserError;
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

  const apiKey = import.meta.env.VITE_VERTEX_AI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('missing-api-key');
  }
  const response = await fetch(
    getVertexModelUrl(apiKey),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Identify the main object in this image in English. Then translate it to ${targetLanguage}. Format exactly: Object: [name] | Translation: [${targetLanguage} word]. Keep it simple and concise. Respond in plain text only. Do not use markdown, bold, or formatting.`,
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
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
    throw new Error(`request-failed:${response.status}`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('no-text-returned');
  }

  return text.replace(/\*\*/g, '');
}
