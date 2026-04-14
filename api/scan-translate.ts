const jsonHeaders = {
  'Content-Type': 'application/json',
};

declare const process: {
  env: Record<string, string | undefined>;
};

function stripDataUrlPrefix(image: string) {
  return image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').trim();
}

function cleanDetectedText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function formatScanRouteError(error: unknown) {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const message = rawMessage.trim();
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('quota') ||
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('rate-limit') ||
    lowerMessage.includes('rate limited') ||
    lowerMessage.includes('429') ||
    lowerMessage.includes('generativelanguage.googleapis.com') ||
    lowerMessage.includes('aiplatform.googleapis.com')
  ) {
    return {
      status: 429,
      message:
        'Translation is temporarily unavailable because the AI service is busy right now. Please try again in a few minutes.',
    };
  }

  return {
    status: 500,
    message: message || 'Scan failed',
  };
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
    `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
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

async function translateWithGeminiSingle(text: string, targetLanguage: string, apiKey: string) {
  return translateWithGemini(text, targetLanguage, apiKey);
}

function getVisionApiKey() {
  return process.env.GOOGLE_VISION_API_KEY || '';
}

function getGeminiApiKey() {
  return (
    process.env.VERTEX_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_VERTEX_AI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    ''
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const image = req.body?.image;
    const sourceText = typeof req.body?.sourceText === 'string' ? req.body.sourceText : '';
    const targetLanguage = req.body?.targetLanguage || 'Hiligaynon';

    const geminiApiKey = getGeminiApiKey();
    const visionApiKey = getVisionApiKey();

    if (!geminiApiKey) {
      return res.status(500).json({
        error: 'Missing Vertex AI API key. Add VERTEX_AI_API_KEY or GEMINI_API_KEY.',
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

    const translatedText = await translateWithGeminiSingle(detectedText, targetLanguage, geminiApiKey);

    return res.status(200).json({
      detectedText,
      translatedText,
      confidence: sourceText ? 'manual' : 'vision',
      provider: sourceText ? 'gemini' : 'google-vision+gemini',
    });
  } catch (error: any) {
    console.error('scan-translate error:', error);
    const formatted = formatScanRouteError(error);
    return res.status(formatted.status).json({
      error: formatted.message,
    });
  }
}
