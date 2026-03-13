const jsonHeaders = {
  'Content-Type': 'application/json',
};

async function callGemini(prompt: string, apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
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
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!response.ok || !text) {
    throw new Error('gemini-failed');
  }

  return { text, provider: 'gemini' };
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
  const text = data?.choices?.[0]?.message?.content;
  if (!response.ok || !text) {
    throw new Error('openrouter-failed');
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
  const text = data?.choices?.[0]?.message?.content;
  if (!response.ok || !text) {
    throw new Error('groq-failed');
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

    const providers = [
      process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
        ? () => callGemini(prompt, process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '')
        : null,
      process.env.OPENROUTER_API_KEY
        ? () => callOpenRouter(prompt, process.env.OPENROUTER_API_KEY || '')
        : null,
      process.env.GROQ_API_KEY
        ? () => callGroq(prompt, process.env.GROQ_API_KEY || '')
        : null,
    ].filter(Boolean) as Array<() => Promise<{ text: string; provider: string }>>;

    if (providers.length === 0) {
      res.status(500).json({ error: 'No AI provider configured. Add GEMINI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY.' });
      return;
    }

    let lastError: unknown = null;
    for (const provider of providers) {
      try {
        const result = await provider();
        res.status(200).json(result);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    res.status(502).json({ error: 'All AI providers failed', details: String(lastError) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
