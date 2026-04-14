declare const process: {
  env: Record<string, string | undefined>;
};

const jsonHeaders = {
  'Content-Type': 'application/json',
};

function getVertexModelUrl(apiKey: string, model = 'gemini-2.5-pro') {
  const project =
    process.env.VERTEX_AI_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    '';
  const location = process.env.VERTEX_AI_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || 'global';

  if (!project) {
    throw new Error('Missing VERTEX_AI_PROJECT_ID or GOOGLE_CLOUD_PROJECT for Vertex AI.');
  }

  return `https://aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent?key=${apiKey}`;
}

async function callGemini(prompt: string, apiKey: string) {
  const response = await fetch(getVertexModelUrl(apiKey), {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

  const data = await response.json();
  console.log('Gemini text response:', data);

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!response.ok) {
    throw new Error(data?.error?.message || 'gemini-failed');
  }

  if (!text) {
    throw new Error('Gemini returned no text');
  }

  return { text, provider: 'vertex-ai' };
}

async function callGeminiSingle(prompt: string, apiKey: string) {
  return callGemini(prompt, apiKey);
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
    console.log('Has VERTEX_AI_API_KEY:', !!process.env.VERTEX_AI_API_KEY);
    console.log('Has GEMINI_API_KEY:', !!process.env.GEMINI_API_KEY);
    console.log('Has OPENROUTER_API_KEY:', !!process.env.OPENROUTER_API_KEY);
    console.log('Has GROQ_API_KEY:', !!process.env.GROQ_API_KEY);

    const geminiApiKey = process.env.VERTEX_AI_API_KEY || process.env.GEMINI_API_KEY;

    const providers = [
      geminiApiKey
        ? () => callGeminiSingle(prompt, geminiApiKey)
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
        error: 'No AI provider configured. Add VERTEX_AI_API_KEY or GEMINI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY.',
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
