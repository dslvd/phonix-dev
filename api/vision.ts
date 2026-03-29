// ─── Vision Provider interface ────────────────────────────────────────────────

interface VisionResult {
  text: string;
  provider: string;
}

abstract class VisionAIProvider {
  abstract readonly name: string;
  abstract call(image: string, targetLanguage: string): Promise<VisionResult>;

  protected buildPrompt(targetLanguage: string): string {
    return (
      `Identify the main object in this image in English. ` +
      `Then translate it to ${targetLanguage}. ` +
      `Format exactly: Object: [name] | Translation: [${targetLanguage} word]. ` +
      `Keep it simple and concise.`
    );
  }
}

// ─── Concrete providers ───────────────────────────────────────────────────────

class GeminiVisionProvider extends VisionAIProvider {
  readonly name = 'gemini';

  constructor(private readonly apiKey: string) {
    super();
  }

  async call(image: string, targetLanguage: string): Promise<VisionResult> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: this.buildPrompt(targetLanguage) },
                { inline_data: { mime_type: 'image/jpeg', data: image } },
              ],
            },
          ],
        }),
      },
    );

    const data = await response.json();
    console.log('Gemini vision response:', data);

    if (!response.ok) throw new Error(data?.error?.message || 'gemini-vision-failed');

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini vision returned no text');

    return { text, provider: this.name };
  }
}

class OpenRouterVisionProvider extends VisionAIProvider {
  readonly name = 'openrouter';
  private readonly model: string;

  constructor(private readonly apiKey: string) {
    super();
    this.model = process.env.OPENROUTER_VISION_MODEL || 'openai/gpt-4o-mini';
  }

  async call(image: string, targetLanguage: string): Promise<VisionResult> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://phonix.app',
        'X-Title': 'Phonix',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: this.buildPrompt(targetLanguage) },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    console.log('OpenRouter vision response:', data);

    if (!response.ok) throw new Error(data?.error?.message || 'openrouter-vision-failed');

    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenRouter vision returned no text');

    return { text, provider: this.name };
  }
}

// ─── Vision Provider Chain ────────────────────────────────────────────────────

class VisionProviderChain {
  private readonly providers: VisionAIProvider[];

  constructor(providers: VisionAIProvider[]) {
    this.providers = providers;
  }

  static fromEnv(): VisionProviderChain {
    const providers: VisionAIProvider[] = [];
    if (process.env.GEMINI_API_KEY) providers.push(new GeminiVisionProvider(process.env.GEMINI_API_KEY));
    if (process.env.OPENROUTER_API_KEY) providers.push(new OpenRouterVisionProvider(process.env.OPENROUTER_API_KEY));
    return new VisionProviderChain(providers);
  }

  get hasProviders(): boolean {
    return this.providers.length > 0;
  }

  async run(image: string, targetLanguage: string): Promise<VisionResult> {
    let lastError: unknown;
    for (const provider of this.providers) {
      try {
        return await provider.call(image, targetLanguage);
      } catch (err) {
        console.error(`Vision provider ${provider.name} failed:`, err);
        lastError = err;
      }
    }
    throw new Error(`All vision providers failed: ${String(lastError)}`);
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const image = req.body?.image;
    const targetLanguage = req.body?.targetLanguage || 'Hiligaynon';

    if (!image) {
      res.status(400).json({ error: 'Image is required' });
      return;
    }

    console.log('Vision route hit');
    console.log('Has GEMINI_API_KEY:', !!process.env.GEMINI_API_KEY);
    console.log('Has OPENROUTER_API_KEY:', !!process.env.OPENROUTER_API_KEY);

    const chain = VisionProviderChain.fromEnv();
    if (!chain.hasProviders) {
      res.status(500).json({
        error: 'No vision provider configured. Add GEMINI_API_KEY or OPENROUTER_API_KEY.',
      });
      return;
    }

    const result = await chain.run(image, targetLanguage);
    res.status(200).json(result);
  } catch (error) {
    console.error('Vision route error:', error);
    res.status(502).json({ error: 'All vision providers failed', details: String(error) });
  }
}
