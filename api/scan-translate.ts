import Tesseract from 'tesseract.js';

function translateText(text: string, targetLanguage: string) {
  if (!text.trim()) return '';

  if (targetLanguage === 'Hiligaynon') return `Hiligaynon: ${text}`;
  if (targetLanguage === 'Bisaya') return `Bisaya: ${text}`;
  if (targetLanguage === 'Tagalog') return `Tagalog: ${text}`;

  return text;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, sourceText, targetLanguage } = req.body;

    if (sourceText && typeof sourceText === 'string') {
      return res.status(200).json({
        detectedText: sourceText,
        translatedText: translateText(sourceText, targetLanguage || 'Hiligaynon'),
      });
    }

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'No image or text provided' });
    }

    const result = await Tesseract.recognize(image, 'eng');
    const detectedText = result.data.text.trim();

    return res.status(200).json({
      detectedText,
      translatedText: translateText(detectedText, targetLanguage || 'Hiligaynon'),
    });
  } catch (error: any) {
    console.error('scan-translate error:', error);
    return res.status(500).json({
      error: error?.message || 'Scan failed',
    });
  }
}