import { useState, useRef, useEffect, type ChangeEvent, type ClipboardEvent as ReactClipboardEvent, type DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import Button from '../components/Button';
import Card from '../components/Card';
import NavigationHeader from '../components/NavigationHeader';
import { Page, AppState, BackpackItem, UpdateStateFn } from '../App';
import { usePremium } from '../lib/usePremium';
import { BATTERY_MAX, spendBattery } from '../lib/battery';

interface ScanModeProps {
  navigate: (page: Page) => void;
  appState: AppState;
  updateState: UpdateStateFn;
  premium: ReturnType<typeof usePremium>;
}

interface ScanResult {
  detectedText: string;
  translatedText: string;
  confidence: string;
}

interface ScanApiResponse {
  detectedText: string;
  translatedText: string;
  confidence?: string;
}

interface PendingAttachment {
  file?: File;
  sourceText?: string;
  name: string;
  type: 'file' | 'pasted-image' | 'pasted-text';
}

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

const cleanOCRText = (text: string) => text.replace(/\s+/g, ' ').trim();

export default function ScanMode({ navigate, appState, updateState, premium }: ScanModeProps) {
  const isGuestMode = (() => {
    if (typeof window === 'undefined') {
      return false;
    }

    const rawUser = window.localStorage.getItem('user');
    if (!rawUser) {
      return false;
    }

    try {
      const user = JSON.parse(rawUser) as { name?: string; email?: string };
      const name = (user.name || '').trim().toLowerCase();
      const email = (user.email || '').trim();
      return name === 'guest' || email.length === 0;
    } catch {
      return false;
    }
  })();
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedScans, setSavedScans] = useState<ScanResult[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showQuickTips, setShowQuickTips] = useState(true);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [manualText, setManualText] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const guideBoxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUseBatteryAction = () => {
    if (premium.isPremium) {
      return true;
    }

    if (appState.batteriesRemaining <= 0) {
      setShowUpgradeModal(true);
      setError('Out of Batteries! Every mistake costs 1 battery. Upgrade to premium for unlimited batteries, or come back later and keep practicing.');
      return false;
    }

    return true;
  };

  const spendBatteryIfNeeded = () => {
    if (premium.isPremium) {
      return;
    }

    updateState((prev) => {
      const nextBatteryState = spendBattery(
        {
          batteriesRemaining: prev.batteriesRemaining,
          batteryResetAt: prev.batteryResetAt,
        },
        1
      );

      return {
        batteriesRemaining: nextBatteryState.batteriesRemaining,
        batteryResetAt: nextBatteryState.batteryResetAt,
      };
    });
  };

  const requireLoginForAI = () => {
    if (!isGuestMode) {
      return true;
    }

    setShowLoginRequiredModal(true);
    setError('Log in to use AI scan, file upload, and manual translation.');
    return false;
  };

  const startCamera = async () => {
  if (!requireLoginForAI()) return;
  try {
    setError(null);
    setCameraLoading(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera not supported in this browser. Try Chrome, Firefox, or Safari.');
      setCameraLoading(false);
      return;
    }

    let stream: MediaStream | null = null;

    try {
      // Ask for camera permission with the simplest possible request first.
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (basicError) {
      const cameras = await getCameras();

      if (cameras.length === 0) {
        setError('No camera found. Please connect a camera and try again.');
        setCameraLoading(false);
        return;
      }

      const preferredCamera =
        cameras.find(c =>
          !c.label.toLowerCase().includes('phone') &&
          !c.label.toLowerCase().includes('android') &&
          !c.label.toLowerCase().includes('iphone') &&
          !c.label.toLowerCase().includes('droid') &&
          !c.label.toLowerCase().includes('obs') &&
          !c.label.toLowerCase().includes('virtual')
        ) || cameras[0];

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: preferredCamera.deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    }

    if (!stream) {
      throw new Error('Could not start camera stream.');
    }

    streamRef.current = stream;

    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!videoRef.current) {
      setError('Video element not ready. Please try again.');
      setCameraLoading(false);
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    const videoElement = videoRef.current;

    videoElement.srcObject = stream;

    videoElement.onloadedmetadata = async () => {
      try {
        await videoElement.play();
        setCameraActive(true);
        setCameraLoading(false);
      } catch {
        setError('Failed to start video playback.');
        setCameraLoading(false);
      }
    };
  } catch (err: any) {
    setCameraLoading(false);
    const errorName = String(err?.name || '').toLowerCase();

    if (errorName.includes('notallowed') || errorName.includes('permission')) {
      setError('Camera permission was blocked. Please allow camera access in your browser and try again.');
      return;
    }

    if (errorName.includes('notfound') || errorName.includes('devicesnotfound')) {
      setError('No camera was found on this device.');
      return;
    }

    if (errorName.includes('notreadable') || errorName.includes('trackstart')) {
      setError('Your camera is busy or unavailable. Close other apps using the camera and try again.');
      return;
    }

    setError(`Camera error: ${err.message || 'Unknown error'}`);
  }
};

  const getCameras = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === 'videoinput');
};

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setCameraLoading(false);
  };

  const playSuccessSound = () => {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;

    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

const translateTextWithGemini = async (text: string, targetLanguage: string) => {
  const apiKeys = [
    import.meta.env.VITE_GEMINI_API_KEY,
    import.meta.env.VITE_GEMINI_API_KEY_BACKUP,
  ].filter(Boolean) as string[];

  if (apiKeys.length === 0) {
    throw new Error('Missing VITE_GEMINI_API_KEY or VITE_GEMINI_API_KEY_BACKUP in .env');
  }

  const prompt = `
Translate the following text into ${targetLanguage}.
Return only the translated text.
Do not explain anything.

Text: ${text}
  `.trim();

  let lastError: unknown = null;

  for (let index = 0; index < apiKeys.length; index += 1) {
    const apiKey = apiKeys[index];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      lastError = new Error(data?.error?.message || 'Gemini translation failed');

      if (response.status === 429 && index < apiKeys.length - 1) {
        console.warn('Primary Gemini key is rate-limited for translation, trying backup Gemini key.');
        continue;
      }

      throw lastError;
    }

    const translatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!translatedText) {
      lastError = new Error('Gemini returned no text');
      break;
    }

    return translatedText.trim();
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini translation failed');
};

const detectTextWithVisionBrowser = async (image: string) => {
  const apiKey = import.meta.env.VITE_GOOGLE_VISION_API_KEY;

  if (!apiKey) {
    throw new Error('Missing Google Vision API key for local scan fallback.');
  }

  const base64Image = image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').trim();

  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          image: {
            content: base64Image,
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
    throw new Error(data?.error?.message || 'Google Vision OCR failed');
  }

  const rawText =
    data?.responses?.[0]?.fullTextAnnotation?.text ||
    data?.responses?.[0]?.textAnnotations?.[0]?.description ||
    '';

  const detectedText = cleanOCRText(rawText);

  if (!detectedText) {
    throw new Error('No readable text found');
  }

  return detectedText;
};

const scanTextWithVisionBrowserFallback = async (image: string, targetLanguage: string) => {
  const detectedText = await detectTextWithVisionBrowser(image);
  const translatedText = await translateTextWithGemini(detectedText, targetLanguage);

  return {
    detectedText,
    translatedText,
    confidence: 'vision',
  } satisfies ScanApiResponse;
};

const scanTextWithVision = async (image: string, targetLanguage: string) => {
  try {
    const response = await fetch('/api/scan-translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image,
        targetLanguage,
      }),
    });

    const data = (await response.json().catch(() => null)) as (ScanApiResponse & { error?: string }) | null;

    if (!response.ok) {
      throw new Error(data?.error || `Vision scan failed (${response.status})`);
    }

    if (!data?.detectedText || !data?.translatedText) {
      throw new Error('Vision scan returned incomplete data');
    }

    return data;
  } catch (error) {
    console.warn('Server scan route unavailable, trying browser Vision fallback.', error);
    return scanTextWithVisionBrowserFallback(image, targetLanguage);
  }
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });

const readFileAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsText(file);
  });

const extractPdfText = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
      .join(' ');

    pageTexts.push(pageText);
  }

  return cleanOCRText(pageTexts.join(' '));
};

const extractDocxText = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return cleanOCRText(result.value || '');
};

const handleUploadClick = () => {
  if (!requireLoginForAI()) return;
  setError(null);
  fileInputRef.current?.click();
};

const clearPendingAttachment = () => {
  setPendingAttachment(null);
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
};

const attachPendingFile = (file: File, type: PendingAttachment['type'] = 'file') => {
  setError(null);
  setPendingAttachment({
    file,
    name: file.name || (type === 'pasted-image' ? 'Pasted image' : 'Attached file'),
    type,
  });
};

const attachPendingText = (text: string, name = 'Pasted text') => {
  const sourceText = cleanOCRText(text);

  if (!sourceText) {
    setError('The pasted text is empty.');
    return;
  }

  setError(null);
  setPendingAttachment({
    sourceText,
    name,
    type: 'pasted-text',
  });
};

const processAttachment = async (attachment: PendingAttachment) => {
  const targetLanguage = appState.targetLanguage || 'Hiligaynon';
  const sourceTextFromAttachment = cleanOCRText(attachment.sourceText || '');

  if (sourceTextFromAttachment) {
    let translatedText = '';

    try {
      const response = await fetch('/api/scan-translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceText: sourceTextFromAttachment,
          targetLanguage,
        }),
      });

      const data = (await response.json().catch(() => null)) as ScanApiResponse & { error?: string } | null;

      if (!response.ok) {
        throw new Error(data?.error || `Attachment translation failed (${response.status})`);
      }

      translatedText = (data?.translatedText || '').trim();
    } catch (serverError) {
      console.warn('Server attachment translate route unavailable, trying browser Gemini fallback.', serverError);
      translatedText = await translateTextWithGemini(sourceTextFromAttachment, targetLanguage);
    }

    if (!translatedText) {
      throw new Error('Translation is empty');
    }

    return {
      detectedText: sourceTextFromAttachment,
      translatedText,
      confidence: 'upload',
    } satisfies ScanApiResponse;
  }

  if (!attachment.file) {
    throw new Error('No file or pasted text is attached yet.');
  }

  const file = attachment.file;
  const normalizedType = file.type.toLowerCase();
  const lowerName = file.name.toLowerCase();
  const isImage = normalizedType.startsWith('image/');
  const isTextFile =
    normalizedType.startsWith('text/') ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md');
  const isPdf = normalizedType === 'application/pdf' || lowerName.endsWith('.pdf');
  const isDocx =
    normalizedType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx');
  const isLegacyDoc = normalizedType === 'application/msword' || lowerName.endsWith('.doc');

  if (isLegacyDoc) {
    throw new Error('Old .doc files are not supported yet. Please save the document as .docx or PDF first.');
  }

  if (!isImage && !isTextFile && !isPdf && !isDocx) {
    throw new Error('Supported uploads are images, PDF, DOCX, TXT, and MD files.');
  }

  if (isImage) {
    const image = await readFileAsDataUrl(file);
    return scanTextWithVision(image, targetLanguage);
  }

  const sourceText = isPdf
    ? await extractPdfText(file)
    : isDocx
      ? await extractDocxText(file)
      : cleanOCRText(await readFileAsText(file));

  if (!sourceText) {
    throw new Error('This file is empty or has no readable text.');
  }

  let translatedText = '';

  try {
    const response = await fetch('/api/scan-translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceText,
        targetLanguage,
      }),
    });

    const data = (await response.json().catch(() => null)) as ScanApiResponse & { error?: string } | null;

    if (!response.ok) {
      throw new Error(data?.error || `File translation failed (${response.status})`);
    }

    translatedText = (data?.translatedText || '').trim();
  } catch (serverError) {
    console.warn('Server file translate route unavailable, trying browser Gemini fallback.', serverError);
    translatedText = await translateTextWithGemini(sourceText, targetLanguage);
  }

  if (!translatedText) {
    throw new Error('Translation is empty');
  }

  return {
    detectedText: sourceText,
    translatedText,
    confidence: 'upload',
  } satisfies ScanApiResponse;
};

const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];

  if (!file) return;

  attachPendingFile(file, 'file');
};

const translatePendingAttachment = async () => {
  if (!pendingAttachment) {
    setError('Attach or paste a file first, then translate it.');
    return;
  }

  if (!canUseBatteryAction()) {
    return;
  }

  setIsScanning(true);
  setError(null);

  try {
    const result = await processAttachment(pendingAttachment);

    setScanResult({
      detectedText: result.detectedText,
      translatedText: result.translatedText,
      confidence: result.confidence || 'upload',
    });

    spendBatteryIfNeeded();
    playSuccessSound();
  } catch (err) {
    console.error('Attachment translate error:', err);
    setError(err instanceof Error ? err.message : 'Failed to translate attached content.');
  } finally {
    setIsScanning(false);
  }
};

const handlePasteAttachment = async (event: ReactClipboardEvent<HTMLElement> | globalThis.ClipboardEvent) => {
  const target = event.target as HTMLElement | null;
  const targetTag = target?.tagName?.toLowerCase();
  const isEditableTarget =
    targetTag === 'textarea' ||
    targetTag === 'input' ||
    target?.isContentEditable;

  if (isEditableTarget) {
    return;
  }

  if (!event.clipboardData) {
    return;
  }

  const items = Array.from(event.clipboardData.items || []);
  const fileItem = items.find((item) => item.kind === 'file');
  const textItem = items.find((item) => item.type === 'text/plain');

  if (!fileItem && !textItem) {
    return;
  }

  event.preventDefault();
  setError(null);

  if (fileItem) {
    const file = fileItem.getAsFile();

    if (!file) {
      setError('Could not read the pasted file.');
      return;
    }

    attachPendingFile(file, file.type.startsWith('image/') ? 'pasted-image' : 'file');
    return;
  }

  if (textItem) {
    textItem.getAsString((value) => {
      attachPendingText(value, 'Pasted text');
    });
  }
};

const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
  if (!event.dataTransfer?.types?.includes('Files')) {
    return;
  }

  event.preventDefault();
  setIsDragActive(true);
};

const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
  if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
    return;
  }

  setIsDragActive(false);
};

const handleDropAttachment = (event: DragEvent<HTMLDivElement>) => {
  event.preventDefault();
  setIsDragActive(false);

  const file = event.dataTransfer.files?.[0];

  if (!file) {
    return;
  }

  attachPendingFile(file, 'file');
};

const captureAndAnalyze = async () => {
  if (!requireLoginForAI()) return;
  if (!videoRef.current || !canvasRef.current || !guideBoxRef.current) return;
  if (!canUseBatteryAction()) return;

  setIsScanning(true);
  setError(null);

  try {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setError('Could not access image canvas.');
      return;
    }

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (!videoWidth || !videoHeight) {
      setError('Camera not ready yet.');
      return;
    }

    const videoRect = video.getBoundingClientRect();
    const guideRect = guideBoxRef.current.getBoundingClientRect();

    const scaleX = videoWidth / videoRect.width;
    const scaleY = videoHeight / videoRect.height;

    let cropX = (guideRect.left - videoRect.left) * scaleX;
    let cropY = (guideRect.top - videoRect.top) * scaleY;
    let cropWidth = guideRect.width * scaleX;
    let cropHeight = guideRect.height * scaleY;

    const verticalInset = cropHeight * 0.1;
    const horizontalInset = cropWidth * 0.02;

    cropX += horizontalInset;
    cropY += verticalInset;
    cropWidth -= horizontalInset * 2;
    cropHeight -= verticalInset * 2;

    canvas.width = Math.max(1, Math.floor(cropWidth));
    canvas.height = Math.max(1, Math.floor(cropHeight));

    ctx.drawImage(
      video,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const upscaleCanvas = document.createElement('canvas');
    const upscaleCtx = upscaleCanvas.getContext('2d');

    if (!upscaleCtx) {
      setError('Could not create upscale canvas.');
      return;
    }

    const scale = 1.4;
    upscaleCanvas.width = Math.floor(canvas.width * scale);
    upscaleCanvas.height = Math.floor(canvas.height * scale);

    upscaleCtx.imageSmoothingEnabled = true;
    upscaleCtx.drawImage(
      canvas,
      0,
      0,
      canvas.width,
      canvas.height,
      0,
      0,
      upscaleCanvas.width,
      upscaleCanvas.height
    );

    const result = await scanTextWithVision(
      upscaleCanvas.toDataURL('image/jpeg', 0.95),
      appState.targetLanguage || 'Hiligaynon'
    );

    setScanResult({
      detectedText: result.detectedText,
      translatedText: result.translatedText,
      confidence: result.confidence || 'vision',
    });

    spendBatteryIfNeeded();
    playSuccessSound();
  } catch (err) {
    console.error('Scan error:', err);
    setError(err instanceof Error ? err.message : 'Failed to scan and translate text.');
  } finally {
    setIsScanning(false);
  }
};

const translateManualText = async () => {
  if (!requireLoginForAI()) return;
  if (!manualText.trim()) {
    setError('Type text first, then translate.');
    return;
  }

  if (!canUseBatteryAction()) return;

  try {
    setIsScanning(true);
    setError(null);

    const sourceText = manualText.trim();
    const targetLanguage = appState.targetLanguage || 'Hiligaynon';
    let translatedText = '';

    try {
      const response = await fetch('/api/scan-translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceText,
          targetLanguage,
        }),
      });

      const data = (await response.json().catch(() => null)) as ScanApiResponse & { error?: string } | null;

      if (!response.ok) {
        throw new Error(data?.error || `Manual translation failed (${response.status})`);
      }

      translatedText = (data?.translatedText || '').trim();
      if (!translatedText) {
        throw new Error('Translation text is empty from server route');
      }
    } catch (serverError) {
      console.warn('Server manual translate route unavailable, trying browser Gemini fallback.', serverError);

      translatedText = await translateTextWithGemini(sourceText, targetLanguage);
    }

    if (!translatedText.trim()) {
      throw new Error('Translation is empty');
    }

    setScanResult({
      detectedText: sourceText,
      translatedText: translatedText.trim(),
      confidence: 'manual',
    });

    spendBatteryIfNeeded();
  } catch (err) {
    console.error('Manual translate error:', err);
    setError(err instanceof Error ? err.message : 'Translation is temporarily unavailable. Please try again in a few seconds.');
  } finally {
    setIsScanning(false);
  }
};

  const saveScan = () => {
    if (!requireLoginForAI()) return;
    if (!scanResult) return;

    setSavedScans((prev) => [scanResult, ...prev]);

    const source =
      scanResult.confidence === 'manual'
        ? 'manual'
        : scanResult.confidence === 'upload'
          ? 'upload'
          : 'scan';
    const backpackId = `${source}:${scanResult.detectedText.trim().toLowerCase()}=>${scanResult.translatedText
      .trim()
      .toLowerCase()}`;
    const backpackItem: BackpackItem = {
      id: backpackId,
      nativeText: scanResult.translatedText.trim(),
      translatedText: scanResult.detectedText.trim(),
      source,
      createdAt: new Date().toISOString(),
      emoji: source === 'upload' ? '📄' : source === 'manual' ? '⌨️' : '📸',
    };

    if (!appState.backpackItems.find((item) => item.id === backpackId)) {
      updateState((prev) => {
        const existingBackpackItem = prev.backpackItems.find((item) => item.id === backpackId);
        if (existingBackpackItem) {
          return {
            totalXP: prev.totalXP + 3,
          };
        }

        return {
          stars: prev.stars + 1,
          totalXP: prev.totalXP + 12,
          backpackItems: [backpackItem, ...prev.backpackItems],
        };
      });
    } else {
      updateState((prev) => ({
        totalXP: prev.totalXP + 3,
      }));
    }

    setScanResult(null);
  };

  const speakText = (text: string, language: string = 'fil-PH') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find(
        (voice) =>
          voice.lang.toLowerCase().includes('fil') ||
          voice.lang.toLowerCase().includes('tl') ||
          voice.lang.toLowerCase().includes('ph')
      );

      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    const handleWindowPaste = (event: ClipboardEvent) => {
      void handlePasteAttachment(event);
    };

    window.addEventListener('paste', handleWindowPaste);

    return () => {
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [handlePasteAttachment]);

  return (
    <div
      className={`theme-page min-h-screen text-slate-100 ${isDragActive ? 'ring-4 ring-[#56b8e8]/50 ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropAttachment}
    >
      <NavigationHeader
        onBack={() => {
          stopCamera();
          navigate('dashboard');
        }}
        onLogout={() => {
          stopCamera();
          navigate('landing');
        }}
        onProfile={() => navigate('profile')}
        showStats={true}
        streakCount={appState.currentStreak}
        starCount={appState.stars}
        batteryCurrent={appState.batteriesRemaining}
        batteryMax={BATTERY_MAX}
        batteryResetAt={appState.batteryResetAt}
        isPremium={premium.isPremium}
      />

      <div className="mx-auto mt-6 max-w-7xl p-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="theme-title mb-2 flex items-center justify-center gap-3 font-baloo text-4xl font-bold">
            <span>📸</span>
            Scan Mode
            <span>📄</span>
          </h1>
          <p className="theme-muted font-semibold">
            Point your camera at text or a document to translate instantly!
          </p>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <Card className="theme-surface relative min-h-[380px] border p-5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt,.md,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileSelected}
                className="hidden"
              />

              <div className="relative h-[260px] overflow-hidden rounded-lg bg-gray-900 sm:h-[290px]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
                />

                {!cameraActive && !cameraLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
                    <div className="text-6xl animate-bounce leading-none flex items-center justify-center">📄</div>
                    <h3 className="text-center font-baloo text-xl font-bold text-white">
                      Ready to Scan Text?
                    </h3>
                    <Button
                      variant="primary"
                      onClick={startCamera}
                      className="text-lg px-8 py-3"
                    >
                      🎥 Start Camera
                    </Button>
                    <div className="space-y-1 rounded-lg bg-gray-800/50 p-3 px-4 text-center text-xs text-white">
                      <p className="font-bold">You&apos;ll be asked for camera permission</p>
                      <p className="theme-muted">Point at text or a document -&gt; OCR translates instantly!</p>
                    </div>
                  </div>
                ) : cameraLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-800">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-6xl leading-none flex items-center justify-center"
                    >
                      📹
                    </motion.div>
                    <p className="text-white font-baloo text-xl font-bold">Starting camera...</p>
                    <p className="theme-muted text-sm">This may take a few seconds</p>
                  </div>
                ) : null}

                {cameraActive && (
                  <>
                    <AnimatePresence>
                      {isScanning && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-primary/30 flex items-center justify-center"
                        >
                          <div className="text-white text-2xl font-bold font-baloo flex items-center gap-3">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            >
                              🔍
                            </motion.div>
                            Scanning text...
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div
                        ref={guideBoxRef}
                        className="h-[74%] w-[96%] max-h-[320px] max-w-[900px] rounded-lg border-4 border-dashed border-white opacity-80"
                      />
                    </div>
                  </>
                )}
              </div>

              {cameraActive && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex justify-center gap-3"
                >
                  <Button
                    variant="primary"
                    onClick={captureAndAnalyze}
                    disabled={isScanning}
                    className="flex-1"
                  >
                    {isScanning ? '⏳ Scanning...' : '📄 Scan Text'}
                  </Button>
                  <Button variant="outline" onClick={stopCamera}>
                    ⏹️
                  </Button>
                </motion.div>
              )}

              <div className="mt-5 rounded-2xl border border-[#56b8e8]/30 bg-gradient-to-br from-[#56b8e8]/10 to-[#56b8e8]/5 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="theme-title font-baloo text-xl font-bold">Upload File</h4>
                    <p className="theme-muted mt-1 max-w-md text-sm font-semibold leading-7">
                      Attach an image, PDF, DOCX, or text file, or paste text/image here, then click translate.
                    </p>
                    {pendingAttachment && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-sm font-semibold text-primary dark:bg-white/10">
                          <span className="truncate">Attached: {pendingAttachment.name}</span>
                          <button
                            onClick={clearPendingAttachment}
                            className="theme-muted rounded-full border px-2 py-0.5 text-xs font-bold transition hover:text-primary"
                            aria-label="Remove attached file"
                          >
                            x
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="w-full sm:w-auto sm:min-w-[220px]">
                    <Button
                      variant={pendingAttachment ? 'primary' : 'secondary'}
                      onClick={pendingAttachment ? translatePendingAttachment : handleUploadClick}
                      disabled={isScanning}
                      className="w-full"
                    >
                      {isScanning ? 'Translating...' : pendingAttachment ? 'Translate' : 'Attach File'}
                    </Button>
                  </div>
                </div>
                <p className="theme-muted mt-3 text-xs font-semibold">
                  Tip: press `Ctrl+V` to paste an image, copied file, or text, or drag and drop a file anywhere on this page.
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-3"
                >
                  <div className="rounded-lg border-2 border-red-400 bg-red-100 p-4">
                    <div className="mb-2 font-bold text-red-700">{error}</div>
                    <div className="mt-3 rounded-lg bg-white p-3">
                      <p className="mb-2 text-sm font-bold text-gray-800">Troubleshooting:</p>
                      <ul className="space-y-1 text-xs text-gray-700">
                        <li>Allow camera permissions when prompted</li>
                        <li>Refresh the page after allowing permissions</li>
                        <li>Hold the camera steady</li>
                        <li>Use good lighting for documents</li>
                        <li>Keep text centered and readable</li>
                        <li>For uploads, use an image, PDF, DOCX, TXT, or MD file</li>
                      </ul>
                      <Button
                        variant="primary"
                        onClick={startCamera}
                        className="w-full mt-3 text-sm"
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </Card>

            <Card className="theme-surface-soft border p-5">
              <h3 className="theme-title mb-3 flex items-center gap-2 font-baloo text-xl font-bold">
                <span>⌨️</span>
                Manual Text Translate
              </h3>
              <p className="theme-muted mb-4 text-sm font-semibold leading-7">
                If camera OCR is slow or unclear, type the text manually and translate it instantly.
              </p>

              <div className="flex flex-col gap-3">
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Type or paste text here..."
                  rows={6}
                  className="theme-surface min-h-[180px] w-full resize-none rounded-2xl border-2 px-4 py-4 font-semibold outline-none transition-all focus:border-[#56b8e8]"
                />

                <Button
                  variant="secondary"
                  onClick={translateManualText}
                  disabled={isScanning}
                  className="w-full"
                >
                  {isScanning ? '⏳ Translating...' : '⚡ Translate Text'}
                </Button>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <AnimatePresence>
              {scanResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                >
                  <Card className="theme-surface border p-5">
                    <div>
                      <div className="text-center">
                      <div className="text-5xl mb-3 leading-none flex items-center justify-center">✨</div>
                      <h3 className="theme-title mb-2 font-baloo text-2xl font-bold">
                        Translation Ready!
                      </h3>

                      <p className="theme-muted mb-4 text-xs font-bold uppercase tracking-[0.2em]">
                        {scanResult.confidence === 'manual'
                          ? 'Manual Input'
                          : scanResult.confidence === 'upload'
                            ? 'Uploaded File'
                            : 'Camera OCR'}
                      </p>

                      <div className="theme-surface-soft mb-4 rounded-2xl border p-4 text-left">
                        <p className="theme-muted mb-1 font-semibold">Detected Text:</p>
                        <p className="theme-title mb-4 max-h-40 overflow-y-auto break-words whitespace-pre-wrap pr-1 text-sm font-semibold leading-7">
                          {scanResult.detectedText}
                        </p>

                        <p className="theme-muted mb-1 font-semibold">
                          {appState.targetLanguage}:
                        </p>

                        {/* ✅ YOUR NEW BLOCK */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              onClick={() => scanResult.translatedText && speakText(scanResult.translatedText)}
                              className="max-h-64 cursor-pointer overflow-y-auto break-words whitespace-pre-wrap pr-1 text-lg font-bold leading-8 text-primary"
                              title="Tap to hear pronunciation"
                            >
                              {scanResult.translatedText || '—'}
                            </p>

                            {scanResult.translatedText && (
                              <button
                                onClick={() => speakText(scanResult.translatedText)}
                                className="text-3xl hover:scale-110 transition-transform"
                              >
                                🔊
                              </button>
                            )}
                          </div>

                          {!scanResult.translatedText && (
                            <div className="theme-muted mt-2 text-sm">
                              <p className="italic">
                                Translation is not available right now.
                              </p>
                              <p className="text-xs">
                                Please try again in a few seconds.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>  {/* ✅ THIS ONE IS VERY IMPORTANT */}

                      {/* buttons OUTSIDE */}
                      <div className="flex gap-3">
                        <Button variant="success" onClick={saveScan} className="flex-1">
                          💾 Save to Collection
                        </Button>
                        <Button variant="outline" onClick={() => setScanResult(null)} className="min-w-[84px]">
                          ✖️
                        </Button>
                      </div>
                    </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <Card className="theme-surface border">
              <h3 className="theme-title mb-3 flex items-center gap-2 font-baloo text-xl font-bold">
                <span>📝</span>
                Scanned Text ({savedScans.length})
              </h3>

              <div className="max-h-96 space-y-2 overflow-y-auto">
                {savedScans.length === 0 ? (
                  <div className="theme-muted py-8 text-center">
                    <div className="text-4xl mb-2 leading-none flex items-center justify-center">👀</div>
                    <p className="font-semibold">No saved scans yet!</p>
                    <p className="text-sm">Scan text or documents to save translations</p>
                  </div>
                ) : (
                  savedScans.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="theme-surface-soft rounded-lg border p-3"
                    >
                      <p className="theme-title mb-1 break-words whitespace-pre-wrap text-sm font-bold">
                        {item.detectedText}
                      </p>
                      <div className="flex items-start justify-between gap-2">
                        <p
                          onClick={() => item.translatedText && speakText(item.translatedText)}
                          className="flex-1 cursor-pointer break-words whitespace-pre-wrap text-lg font-bold text-primary"
                          title="Tap to hear pronunciation"
                        >
                          {item.translatedText}
                        </p>
                        <button
                          onClick={() => speakText(item.translatedText)}
                          className="text-2xl hover:scale-110 transition-transform leading-none flex items-center justify-center flex-shrink-0"
                        >
                          🔊
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {savedScans.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => navigate('collection')}
                  className="mt-4 w-full"
                >
                  View Full Collection 🎒
                </Button>
              )}
            </Card>

          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showQuickTips && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="fixed bottom-24 right-4 z-40 w-[min(360px,calc(100vw-2rem))] lg:bottom-6 lg:right-6"
          >
            <Card className="theme-surface-soft border shadow-2xl">
              <div className="mb-3 flex items-start justify-between gap-3">
                <h4 className="theme-title flex items-center gap-2 font-baloo text-lg font-bold">
                  <span>💡</span>
                  Quick Tips
                </h4>
                <button
                  onClick={() => setShowQuickTips(false)}
                  className="theme-muted rounded-full px-2 py-1 text-sm font-bold transition hover:text-primary"
                  aria-label="Close quick tips"
                >
                  x
                </button>
              </div>
              <ul className="theme-text-soft space-y-2 text-sm font-semibold">
                <li className="flex gap-2">
                  <span>✨</span>
                  <span>Use good lighting for documents</span>
                </li>
                <li className="flex gap-2">
                  <span>📄</span>
                  <span>Keep text inside the center guide box</span>
                </li>
                <li className="flex gap-2">
                  <span>📷</span>
                  <span>Hold the camera steady before scanning</span>
                </li>
                <li className="flex gap-2">
                  <span>🔊</span>
                  <span>Tap the speaker icon to hear the translation</span>
                </li>
              </ul>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLoginRequiredModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowLoginRequiredModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <Card className="theme-surface border p-6 text-center">
                <div className="text-6xl leading-none">🔐</div>
                <h3 className="theme-title mt-3 font-baloo text-3xl font-bold">Log in to continue</h3>
                <p className="theme-muted mt-2 font-semibold">
                  AI features like scan, upload, and smart translation are available to logged-in users.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => {
                      setShowLoginRequiredModal(false);
                      navigate('landing');
                    }}
                    className="flex-1 rounded-xl border-b-4 border-[#FF9126] bg-[#FF9126] px-4 py-3 font-bold text-[#4a2a00]"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => setShowLoginRequiredModal(false)}
                    className="theme-nav-button flex-1 rounded-xl border px-4 py-3 font-bold"
                  >
                    Stay in Guest Mode
                  </button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>

      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowUpgradeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full"
            >
              <Card className="theme-surface border-2 border-[#FF9126] shadow-2xl">
                <div className="text-center text-white">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                    className="text-8xl mb-4 leading-none flex items-center justify-center"
                  >
                    🚫
                  </motion.div>

                  <h2 className="mb-4 font-baloo text-3xl font-bold text-[#dff1ff]">
                    Need More Batteries?
                  </h2>

                  <p className="mb-6 text-lg text-[#cbe4f6]">
                    Free learners get {BATTERY_MAX} batteries, and every lesson mistake removes 1. Upgrade to <strong>Unlimited Batteries</strong> for stress-free practice!
                  </p>

                  <div className="theme-surface-soft mb-6 rounded-xl border p-4">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="text-3xl leading-none flex items-center justify-center">✨</span>
                      <h3 className="theme-title text-xl font-bold">Premium Features</h3>
                      <span className="text-3xl leading-none flex items-center justify-center">✨</span>
                    </div>
                    <ul className="theme-text-soft space-y-2 text-left text-sm">
                      <li className="flex items-center gap-2">
                        <span className="text-xl leading-none flex items-center justify-center">∞</span>
                        <span>Unlimited batteries forever</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-xl leading-none flex items-center justify-center">📄</span>
                        <span>Document translation</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-xl leading-none flex items-center justify-center">🔌</span>
                        <span>Offline mode</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setShowUpgradeModal(false);
                        navigate('premium');
                      }}
                      className="w-full rounded-xl border-b-4 border-[#FF9126] bg-[#FF9126] py-4 font-bold text-[#4a2a00] shadow-lg transition-colors hover:brightness-105"
                    >
                      <span className="flex items-center justify-center gap-2 text-lg">
                        <span>🚀</span>
                        Unlock Unlimited Batteries
                        <span>🔋</span>
                      </span>
                    </motion.button>

                    <button
                      onClick={() => setShowUpgradeModal(false)}
                      className="theme-muted w-full py-2 text-sm font-semibold transition-colors hover:text-white"
                    >
                      Maybe Later
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
