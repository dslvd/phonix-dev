const jsonHeaders = {
  'Content-Type': 'application/json',
};

function stripDataUrlPrefix(image: string) {
  return image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').trim();
}

function cleanDetectedText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

async function detectTextWithGoogleVision(image: string, apiKey: string) {
  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      requests: [
        {
          image: {
            content: stripDataUrlPrefix(image),
          },
          features: [{ type: 'TEXT_DETECTION' }],
          imageContext: {
            languageHints: ['en'],
          },
        },
      ],
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message || 'google-vision-failed');
  }

  const visionResponse = data?.responses?.[0];

  if (visionResponse?.error?.message) {
    throw new Error(visionResponse.error.message);
  }

  const rawText =
    visionResponse?.fullTextAnnotation?.text ||
    visionResponse?.textAnnotations?.[0]?.description ||
    '';

  const detectedText = cleanDetectedText(rawText);

  if (!detectedText) {
    throw new Error('No readable text found');
  }

  return detectedText;
}

async function translateWithGemini(text: string, targetLanguage: string, apiKey: string) {
  const prompt = `
Translate the following text into ${targetLanguage}.
Return only the translated text.
Do not explain anything.

Text: ${text}
  `.trim();

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

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message || 'gemini-translation-failed');
  }

  const translatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!translatedText) {
    throw new Error('Gemini returned no text');
  }

  return translatedText;
}

async function translateWithGeminiFallback(text: string, targetLanguage: string, apiKeys: string[]) {
  let lastError: unknown = null;

  for (let index = 0; index < apiKeys.length; index += 1) {
    const apiKey = apiKeys[index];

    try {
      return await translateWithGemini(text, targetLanguage, apiKey);
    } catch (error: any) {
      lastError = error;
      const message = String(error?.message || '');

      if ((message.includes('429') || message.toLowerCase().includes('quota')) && index < apiKeys.length - 1) {
        console.warn('Primary Gemini server key is rate-limited, trying backup Gemini server key.');
        continue;
      }

      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('gemini-translation-failed');
}

function getVisionApiKey() {
  return process.env.GOOGLE_VISION_API_KEY || '';
}

function getGeminiApiKeys() {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_BACKUP,
    process.env.GOOGLE_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY_BACKUP,
  ].filter(Boolean) as string[];
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const image = req.body?.image;
    const sourceText = typeof req.body?.sourceText === 'string' ? req.body.sourceText : '';
    const targetLanguage = req.body?.targetLanguage || 'Hiligaynon';

    const geminiApiKeys = getGeminiApiKeys();
    const visionApiKey = getVisionApiKey();

    if (geminiApiKeys.length === 0) {
      return res.status(500).json({
        error: 'Missing Gemini API key. Add GEMINI_API_KEY or GEMINI_API_KEY_BACKUP.',
      });
    }

    let detectedText = cleanDetectedText(sourceText);

    if (!detectedText) {
      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'No image or text provided' });
      }

      if (!visionApiKey) {
        return res.status(500).json({
          error: 'Missing Google Vision API key. Add GOOGLE_VISION_API_KEY.',
        });
      }

      detectedText = await detectTextWithGoogleVision(image, visionApiKey);
    }

    const translatedText = await translateWithGeminiFallback(detectedText, targetLanguage, geminiApiKeys);

    return res.status(200).json({
      detectedText,
      translatedText,
      confidence: sourceText ? 'manual' : 'vision',
      provider: sourceText ? 'gemini' : 'google-vision+gemini',
    });
  } catch (error: any) {
    console.error('scan-translate error:', error);
    return res.status(500).json({
      error: error?.message || 'Scan failed',
    });
  }
}
