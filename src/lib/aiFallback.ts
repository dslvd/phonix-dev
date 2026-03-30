import { vocabularyData } from '../data/vocabulary';

export interface FallbackScanResult {
  object: string;
  translation: string;
  confidence: 'smart-assist' | 'match';
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

function buildAssistantPrompt(query: string, targetLanguage: string) {
  return [
    'You are a Filipino language translation assistant.',
    `The target language is ${targetLanguage}.`,
    'Answer directly and briefly.',
    'If the user asks for the translation of a word, respond in this style:',
    `"The ${targetLanguage} of door is pwerta."`,
    'Do not add flowery intros, extra encouragement, or long explanations unless the user asks for more detail.',
    'If the user asks a broader language question, still answer briefly and clearly.',
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

export function generateFallbackAIAnswer(query: string, targetLanguage: string) {
  const normalizedQuery = normalize(query);
  const directMatch = findVocabularyMatch(query);

  if (directMatch) {
    return `The ${targetLanguage} of ${directMatch.englishWord} is ${directMatch.nativeWord}.`;
  }

  if (normalizedQuery.includes('hello') || normalizedQuery.includes('greeting')) {
    return `A common greeting in ${targetLanguage} is Kumusta.`;
  }

  if (normalizedQuery.includes('count') || normalizedQuery.includes('number')) {
    return `In ${targetLanguage}, you can start counting with isa, duha, tatlo, apat, lima.`;
  }

  if (normalizedQuery.includes('animal')) {
    const animals = vocabularyData
      .filter((item) => item.category === 'animals')
      .slice(0, 4)
      .map((item) => `${item.englishWord} = ${item.nativeWord}`)
      .join('\n');

    return `Here are some animal words in ${targetLanguage}:\n${animals}`;
  }

  if (normalizedQuery.includes('food')) {
    const foods = vocabularyData
      .filter((item) => item.category === 'food')
      .slice(0, 4)
      .map((item) => `${item.englishWord} = ${item.nativeWord}`)
      .join('\n');

    return `Here are some food words in ${targetLanguage}:\n${foods}`;
  }

  const suggestions = vocabularyData
    .slice(0, 3)
    .map((item) => `${item.englishWord} -> ${item.nativeWord}`)
    .join('\n');

  return `Ask for a direct translation, like "What is the ${targetLanguage} of door?"\n\nExamples:\n${suggestions}`;
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

export async function askCloudAI(query: string, targetLanguage = 'Hiligaynon') {
  const prompt = buildAssistantPrompt(query, targetLanguage);
  const browserApiKeys = [
    import.meta.env.VITE_GEMINI_API_KEY,
    import.meta.env.VITE_GEMINI_API_KEY_BACKUP,
  ].filter(Boolean) as string[];
  const isLocalDev =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (browserApiKeys.length > 0) {
    try {
      return await callGeminiWithBackup(prompt, browserApiKeys);
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
        return apiResponse.text.replace(/\*\*/g, '');
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
