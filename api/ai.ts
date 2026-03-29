// ─── AI Provider interface ────────────────────────────────────────────────────

interface ProviderResult {
  text: string;
  provider: string;
}

abstract class TextAIProvider {
  abstract readonly name: string;
  abstract call(prompt: string): Promise<ProviderResult>;
}

// ─── Concrete providers ───────────────────────────────────────────────────────

class GeminiTextProvider extends TextAIProvider {
  readonly name = 'gemini';

  constructor(private readonly apiKey: string) {
    super();
  }

  async call(prompt: string): Promise<ProviderResult> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );

    const data = await response.json();
    console.log('Gemini text response:', data);

    if (!response.ok) throw new Error(data?.error?.message || 'gemini-failed');

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned no text');

    return { text, provider: this.name };
  }
}

class OpenRouterTextProvider extends TextAIProvider {
  readonly name = 'openrouter';
  private readonly model: string;

  constructor(private readonly apiKey: string) {
    super();
    this.model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
  }

  async call(prompt: string): Promise<ProviderResult> {
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
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    console.log('OpenRouter text response:', data);

    if (!response.ok) throw new Error(data?.error?.message || 'openrouter-failed');

    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenRouter returned no text');

    return { text, provider: this.name };
  }
}

class GroqTextProvider extends TextAIProvider {
  readonly name = 'groq';
  private readonly model: string;

  constructor(private readonly apiKey: string) {
    super();
    this.model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
  }

  async call(prompt: string): Promise<ProviderResult> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    console.log('Groq text response:', data);

    if (!response.ok) throw new Error(data?.error?.message || 'groq-failed');

    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Groq returned no text');

    return { text, provider: this.name };
  }
}

// ─── Provider Chain ───────────────────────────────────────────────────────────

class ProviderChain {
  private readonly providers: TextAIProvider[];

  constructor(providers: TextAIProvider[]) {
    this.providers = providers;
  }

  static fromEnv(): ProviderChain {
    const providers: TextAIProvider[] = [];
    if (process.env.GEMINI_API_KEY) providers.push(new GeminiTextProvider(process.env.GEMINI_API_KEY));
    if (process.env.OPENROUTER_API_KEY) providers.push(new OpenRouterTextProvider(process.env.OPENROUTER_API_KEY));
    if (process.env.GROQ_API_KEY) providers.push(new GroqTextProvider(process.env.GROQ_API_KEY));
    return new ProviderChain(providers);
  }

  get hasProviders(): boolean {
    return this.providers.length > 0;
  }

  async run(prompt: string): Promise<ProviderResult> {
    let lastError: unknown;
    for (const provider of this.providers) {
      try {
        return await provider.call(prompt);
      } catch (err) {
        console.error(`Provider ${provider.name} failed:`, err);
        lastError = err;
      }
    }
    throw new Error(`All providers failed: ${String(lastError)}`);
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { prompt } = req.body ?? {};
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    console.log('AI route hit');
    console.log('Has GEMINI_API_KEY:', !!process.env.GEMINI_API_KEY);
    console.log('Has OPENROUTER_API_KEY:', !!process.env.OPENROUTER_API_KEY);
    console.log('Has GROQ_API_KEY:', !!process.env.GROQ_API_KEY);

    const chain = ProviderChain.fromEnv();
    if (!chain.hasProviders) {
      res.status(500).json({
        error: 'No AI provider configured. Add GEMINI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY.',
      });
      return;
    }

    const result = await chain.run(prompt);
    res.status(200).json(result);
  } catch (error) {
    console.error('AI route error:', error);
    res.status(502).json({ error: 'All AI providers failed', details: String(error) });
  }
}
