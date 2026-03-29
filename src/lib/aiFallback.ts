import { VocabularyRepository } from '../data/vocabulary';

// ─── Interfaces / Types ───────────────────────────────────────────────────────

export interface FallbackScanResult {
  object: string;
  translation: string;
  confidence: 'smart-assist' | 'match';
}

interface AIResponse {
  text: string;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`request-failed:${response.status}`);
  return response.json() as Promise<T>;
}

// ─── AI Provider Strategy ─────────────────────────────────────────────────────

abstract class AIProvider {
  abstract call(prompt: string): Promise<string>;
  abstract callVision(base64Image: string, targetLanguage: string): Promise<string>;

  protected stripMarkdown(text: string): string {
    return text.replace(/\*\*/g, '');
  }
}

class GeminiProvider extends AIProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  async call(prompt: string): Promise<string> {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${prompt}. Respond in plain text only. No markdown.` }] }],
        }),
      },
    );

    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`gemini-failed:${response.status}`);

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('gemini-no-text');
    return this.stripMarkdown(text);
  }

  async callVision(base64Image: string, targetLanguage: string): Promise<string> {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Identify the main object in this image in English. Then translate it to ${targetLanguage}. Format exactly: Object: [name] | Translation: [${targetLanguage} word]. Respond in plain text only.`,
                },
                { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
              ],
            },
          ],
        }),
      },
    );

    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`gemini-vision-failed:${response.status}`);

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('gemini-vision-no-text');
    return this.stripMarkdown(text);
  }
}

// ─── AI Service (uses server route first, then falls back to browser) ─────────

class AIService {
  private static instance: AIService;
  private readonly browserProvider: GeminiProvider | null;

  private constructor() {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    this.browserProvider = apiKey ? new GeminiProvider(apiKey) : null;
  }

  static getInstance(): AIService {
    if (!AIService.instance) AIService.instance = new AIService();
    return AIService.instance;
  }

  async ask(prompt: string): Promise<string> {
    // Try server route first
    try {
      const res = await postJson<AIResponse>('/api/ai', { prompt });
      if (res.text) return res.text.replace(/\*\*/g, '');
    } catch {
      console.warn('Server AI route unavailable, trying browser provider.');
    }

    if (!this.browserProvider) throw new Error('missing-api-key');
    return this.browserProvider.call(prompt);
  }

  async analyzeImage(base64Data: string, targetLanguage: string): Promise<string> {
    // Try server route first
    try {
      const res = await postJson<AIResponse>('/api/vision', { image: base64Data, targetLanguage });
      if (res.text) return res.text.replace(/\*\*/g, '');
    } catch {
      console.warn('Server vision route unavailable, trying browser provider.');
    }

    if (!this.browserProvider) throw new Error('missing-api-key');
    return this.browserProvider.callVision(base64Data, targetLanguage);
  }
}

// ─── Fallback / Local Answer Generator ───────────────────────────────────────

class LocalFallbackGenerator {
  private readonly repo = VocabularyRepository.getInstance();

  generateAnswer(query: string, targetLanguage: string): string {
    const q = query.toLowerCase().trim();
    const directMatch = this.repo.findByQuery(query);

    if (directMatch) {
      return (
        `✨ Smart Helper Mode\n\n` +
        `${directMatch.englishWord} in ${targetLanguage} is ${directMatch.nativeWord} ${directMatch.emoji}\n\n` +
        `Category: ${directMatch.category}\nLevel: ${directMatch.difficulty}`
      );
    }

    if (q.includes('hello') || q.includes('greeting')) {
      return `✨ Smart Helper Mode\n\nTry this greeting: Kumusta! 👋\nYou can also practice friendly words like Maayong aga 🌞 and Salamat 💛`;
    }

    if (q.includes('count') || q.includes('number')) {
      return '✨ Smart Helper Mode\n\nStart with: isa, duha, tatlo, apat, lima 🔢\nPractice saying them slowly and repeat 3 times!';
    }

    const category = q.includes('animal')
      ? 'animals'
      : q.includes('food')
      ? 'food'
      : null;

    if (category) {
      const items = this.repo.getByCategory(category).slice(0, 4);
      const list = items.map((i) => i.toDisplayString()).join('\n');
      return `✨ Smart Helper Mode\n\nHere are some ${category} words:\n${list}`;
    }

    const examples = this.repo.getAll().slice(0, 3).map((i) => i.toDisplayString()).join('\n');
    return (
      `✨ Smart Helper Mode\n\nI can still help even without the cloud AI. ` +
      `Try asking about an animal, food, greeting, or a word from your lessons.\n\nExamples:\n${examples}`
    );
  }

  getScanResult(label: string, targetLanguage: string): FallbackScanResult | null {
    const match = this.repo.findByQuery(label);
    if (match) return { object: match.englishWord, translation: match.nativeWord, confidence: 'match' };

    const cleaned = label.trim();
    if (!cleaned) return null;
    return { object: cleaned, translation: `${cleaned} (${targetLanguage})`, confidence: 'smart-assist' };
  }
}

// ─── Public API (backward-compatible) ────────────────────────────────────────

const aiService = AIService.getInstance();
const fallbackGenerator = new LocalFallbackGenerator();

export function findVocabularyMatch(query: string) {
  return VocabularyRepository.getInstance().findByQuery(query);
}

export function generateFallbackAIAnswer(query: string, targetLanguage: string): string {
  return fallbackGenerator.generateAnswer(query, targetLanguage);
}

export function getFallbackScanResult(label: string, targetLanguage: string): FallbackScanResult | null {
  return fallbackGenerator.getScanResult(label, targetLanguage);
}

export async function askCloudAI(prompt: string): Promise<string> {
  return aiService.ask(prompt);
}

export async function analyzeImageWithAI(base64Data: string, targetLanguage: string): Promise<string> {
  return aiService.analyzeImage(base64Data, targetLanguage);
}
