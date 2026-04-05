declare const process: {
  env: Record<string, string | undefined>;
};

const jsonHeaders = {
  'Content-Type': 'application/json',
};

async function callGemini(prompt: string, apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  const data = await response.json();
  console.log('Gemini text response:', data);

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!response.ok) {
    throw new Error(data?.error?.message || 'gemini-failed');
  }

  if (!text) {
    throw new Error('Gemini returned no text');
  }

  return { text, provider: 'gemini' };
}

async function callGeminiWithFallback(prompt: string, apiKeys: string[]) {
  let lastError: unknown = null;

  for (let index = 0; index < apiKeys.length; index += 1) {
    const apiKey = apiKeys[index];

    try {
      const result = await callGemini(prompt, apiKey);
      return {
        ...result,
        provider: index === 0 ? 'gemini' : 'gemini-backup',
      };
    } catch (error: any) {
      lastError = error;
      const message = String(error?.message || '');

      if ((message.includes('429') || message.toLowerCase().includes('quota')) && index < apiKeys.length - 1) {
        console.warn('Primary Gemini server key is rate-limited, trying backup Gemini server key.');
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('gemini-failed');
}

async function callOpenRouter(prompt: string, apiKey: string) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://phonix.app',
      'X-Title': 'Phonix',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  console.log('OpenRouter text response:', data);

  const text = data?.choices?.[0]?.message?.content;

  if (!response.ok) {
    throw new Error(data?.error?.message || 'openrouter-failed');
  }

  if (!text) {
    throw new Error('OpenRouter returned no text');
  }

  return { text, provider: 'openrouter' };
}

async function callGroq(prompt: string, apiKey: string) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  console.log('Groq text response:', data);

  const text = data?.choices?.[0]?.message?.content;

  if (!response.ok) {
    throw new Error(data?.error?.message || 'groq-failed');
  }

  if (!text) {
    throw new Error('Groq returned no text');
  }

  return { text, provider: 'groq' };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const prompt = req.body?.prompt;

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    console.log('AI route hit');
    console.log('Has GEMINI_API_KEY:', !!process.env.GEMINI_API_KEY);
    console.log('Has GEMINI_API_KEY_BACKUP:', !!process.env.GEMINI_API_KEY_BACKUP);
    console.log('Has OPENROUTER_API_KEY:', !!process.env.OPENROUTER_API_KEY);
    console.log('Has GROQ_API_KEY:', !!process.env.GROQ_API_KEY);

    const geminiApiKeys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_BACKUP].filter(Boolean) as string[];

    const providers = [
      geminiApiKeys.length > 0
        ? () => callGeminiWithFallback(prompt, geminiApiKeys)
        : null,
      process.env.OPENROUTER_API_KEY
        ? () => callOpenRouter(prompt, process.env.OPENROUTER_API_KEY as string)
        : null,
      process.env.GROQ_API_KEY
        ? () => callGroq(prompt, process.env.GROQ_API_KEY as string)
        : null,
    ].filter(Boolean) as Array<() => Promise<{ text: string; provider: string }>>;

    if (providers.length === 0) {
      res.status(500).json({
        error: 'No AI provider configured. Add GEMINI_API_KEY, GEMINI_API_KEY_BACKUP, OPENROUTER_API_KEY, or GROQ_API_KEY.',
      });
      return;
    }

    let lastError: unknown = null;

    for (const provider of providers) {
      try {
        const result = await provider();
        res.status(200).json(result);
        return;
      } catch (error) {
        console.error('Provider failed:', error);
        lastError = error;
      }
    }

    res.status(502).json({ error: 'All AI providers failed', details: String(lastError) });
  } catch (error) {
    console.error('AI route internal error:', error);
    res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
