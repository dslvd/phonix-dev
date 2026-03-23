import { vocabularyData } from '../data/vocabulary';

export interface FallbackScanResult {
  object: string;
  translation: string;
  confidence: 'smart-assist' | 'match';
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
    return `✨ Smart Helper Mode\n\n${directMatch.englishWord} in ${targetLanguage} is ${directMatch.nativeWord} ${directMatch.emoji}\n\nCategory: ${directMatch.category}\nLevel: ${directMatch.difficulty}`;
  }

  if (normalizedQuery.includes('hello') || normalizedQuery.includes('greeting')) {
    return `✨ Smart Helper Mode\n\nTry this greeting: Kumusta! 👋\nYou can also practice friendly words like Maayong aga 🌞 and Salamat 💛`;
  }

  if (normalizedQuery.includes('count') || normalizedQuery.includes('number')) {
    return '✨ Smart Helper Mode\n\nStart with: isa, duha, tatlo, apat, lima 🔢\nPractice saying them slowly and repeat 3 times!';
  }

  if (normalizedQuery.includes('animal')) {
    const animals = vocabularyData
      .filter((item) => item.category === 'animals')
      .slice(0, 4)
      .map((item) => `${item.emoji} ${item.englishWord} = ${item.nativeWord}`)
      .join('\n');

    return `✨ Smart Helper Mode\n\nHere are some animal words:\n${animals}`;
  }

  if (normalizedQuery.includes('food')) {
    const foods = vocabularyData
      .filter((item) => item.category === 'food')
      .slice(0, 4)
      .map((item) => `${item.emoji} ${item.englishWord} = ${item.nativeWord}`)
      .join('\n');

    return `✨ Smart Helper Mode\n\nHere are some food words:\n${foods}`;
  }

  const suggestions = vocabularyData
    .slice(0, 3)
    .map((item) => `${item.englishWord} → ${item.nativeWord} ${item.emoji}`)
    .join('\n');

  return `✨ Smart Helper Mode\n\nI can still help even without the cloud AI. Try asking about an animal, food, greeting, or a word from your lessons.\n\nExamples:\n${suggestions}`;
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

export async function askCloudAI(prompt: string) {
  try {
    const apiResponse = await postJson<{ text?: string }>('/api/ai', { prompt });
    if (apiResponse.text) {
      return apiResponse.text.replace(/\*\*/g, '');
    }
  } catch (error) {
    console.warn('Server AI route unavailable, falling back to browser request.', error);
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('missing-api-key');
  }

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
                text: `${prompt}. Respond in plain text only. Do not use markdown, bold, or formatting.`,
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
    throw new Error(`request-failed:${response.status}`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('no-text-returned');
  }

  return text.replace(/\*\*/g, '');
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

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('missing-api-key');
  }

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
    throw new Error(`request-failed:${response.status}`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('no-text-returned');
  }

  return text.replace(/\*\*/g, '');
}