const jsonHeaders = {
  'Content-Type': 'application/json',
};

declare const process: {
  env: Record<string, string | undefined>;
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

async function callGeminiVision(image: string, targetLanguage: string, apiKey: string) {
  const response = await fetch(getVertexModelUrl(apiKey), {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Identify the main object in this image in English. Then translate it to ${targetLanguage}. Format exactly: Object: [name] | Translation: [${targetLanguage} word]. Keep it simple and concise.`,
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: image,
                },
              },
            ],
          },
        ],
      }),
    });

  const data = await response.json();
  console.log('Gemini vision response:', data);

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!response.ok) {
    throw new Error(data?.error?.message || 'gemini-vision-failed');
  }

  if (!text) {
    throw new Error('Gemini vision returned no text');
  }

  return { text, provider: 'vertex-ai' };
}

async function callOpenRouterVision(image: string, targetLanguage: string, apiKey: string) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://phonix.app',
      'X-Title': 'Phonix',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_VISION_MODEL || 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Identify the main object in this image in English. Then translate it to ${targetLanguage}. Format exactly: Object: [name] | Translation: [${targetLanguage} word]. Keep it simple and concise.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${image}`,
              },
            },
          ],
        },
      ],
    }),
  });

  const data = await response.json();
  console.log('OpenRouter vision response:', data);

  const text = data?.choices?.[0]?.message?.content;

  if (!response.ok) {
    throw new Error(data?.error?.message || 'openrouter-vision-failed');
  }

  if (!text) {
    throw new Error('OpenRouter vision returned no text');
  }

  return { text, provider: 'openrouter' };
}

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
    console.log('Has VERTEX_AI_API_KEY:', !!process.env.VERTEX_AI_API_KEY);
    console.log('Has GEMINI_API_KEY:', !!process.env.GEMINI_API_KEY);
    console.log('Has OPENROUTER_API_KEY:', !!process.env.OPENROUTER_API_KEY);

    const providers = [
      (process.env.VERTEX_AI_API_KEY || process.env.GEMINI_API_KEY)
        ? () =>
            callGeminiVision(
              image,
              targetLanguage,
              (process.env.VERTEX_AI_API_KEY || process.env.GEMINI_API_KEY) as string
            )
        : null,
      process.env.OPENROUTER_API_KEY
        ? () => callOpenRouterVision(image, targetLanguage, process.env.OPENROUTER_API_KEY as string)
        : null,
    ].filter(Boolean) as Array<() => Promise<{ text: string; provider: string }>>;

    if (providers.length === 0) {
      res.status(500).json({
        error: 'No vision provider configured. Add VERTEX_AI_API_KEY or GEMINI_API_KEY, or OPENROUTER_API_KEY.',
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
        console.error('Vision provider failed:', error);
        lastError = error;
      }
    }

    res.status(502).json({ error: 'All vision providers failed', details: String(lastError) });
  } catch (error) {
    console.error('Vision route internal error:', error);
    res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}

