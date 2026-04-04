import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
import NavigationHeader from '../components/NavigationHeader';
import EnergyBar from '../components/EnergyBar';
import { Page, AppState } from '../App';

interface ScanModeProps {
  navigate: (page: Page) => void;
  appState: AppState;
  updateState: (updates: Partial<AppState>) => void;
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

const cleanOCRText = (text: string) => text.replace(/\s+/g, ' ').trim();

export default function ScanMode({ navigate, appState, updateState }: ScanModeProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedScans, setSavedScans] = useState<ScanResult[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [manualText, setManualText] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const guideBoxRef = useRef<HTMLDivElement>(null);

  const startCamera = async () => {
  try {
    setError(null);
    setCameraLoading(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera not supported in this browser. Try Chrome, Firefox, or Safari.');
      setCameraLoading(false);
      return;
    }

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

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: { exact: preferredCamera.deviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

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

const captureAndAnalyze = async () => {
  if (!videoRef.current || !canvasRef.current || !guideBoxRef.current) return;

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

    playSuccessSound();
  } catch (err) {
    console.error('Scan error:', err);
    setError(err instanceof Error ? err.message : 'Failed to scan and translate text.');
  } finally {
    setIsScanning(false);
  }
};

const translateManualText = async () => {
  if (!manualText.trim()) {
    setError('Type text first, then translate.');
    return;
  }

  try {
    setIsScanning(true);
    setError(null);

    let translatedText = '';

    try {
      translatedText = await translateTextWithGemini(
        manualText.trim(),
        appState.targetLanguage || 'Hiligaynon'
      );
    } catch (apiError: any) {
      console.error('Gemini error:', apiError);

      // ✅ Friendly fallback message
      translatedText = '';
      setError('⚠️ Translation is temporarily unavailable. Please try again in a few seconds.');
    }

    setScanResult({
      detectedText: manualText.trim(),
      translatedText,
      confidence: 'manual',
    });
  } finally {
    setIsScanning(false);
  }
};

  const saveScan = () => {
    if (!scanResult) return;

    setSavedScans((prev) => [scanResult, ...prev]);

    if (!appState.learnedWords.includes(scanResult.translatedText)) {
      updateState({
        learnedWords: [...appState.learnedWords, scanResult.translatedText],
        stars: appState.stars + 1,
        totalXP: appState.totalXP + 12,
      });
    } else {
      updateState({
        totalXP: appState.totalXP + 3,
      });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-pink-200 to-orange-200">
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
      />

      <div className="max-w-4xl mx-auto p-4 mt-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="font-baloo text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            <span>📸</span>
            Scan Mode
            <span>📄</span>
          </h1>
          <p className="text-gray-600 font-semibold">
            Point your camera at text or a document to translate instantly!
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card className="bg-white/90 backdrop-blur-xl border-2 border-purple-300">
            <EnergyBar
              current={appState.heartsRemaining}
              max={5}
              isPremium={appState.isPremium}
              onUpgrade={() => setShowUpgradeModal(true)}
            />
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="relative">
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
                />

                {!cameraActive && !cameraLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 p-4">
                    <div className="text-6xl animate-bounce leading-none flex items-center justify-center">📄</div>
                    <h3 className="text-white font-baloo text-xl font-bold text-center">
                      Ready to Scan Text?
                    </h3>
                    <Button
                      variant="primary"
                      onClick={startCamera}
                      className="text-lg px-8 py-3"
                    >
                      🎥 Start Camera
                    </Button>
                    <div className="text-white text-xs px-4 text-center space-y-1 bg-gray-800/50 rounded-lg p-3">
                      <p className="font-bold">You&apos;ll be asked for camera permission</p>
                      <p className="text-gray-300">Point at text or a document → OCR translates instantly!</p>
                    </div>
                  </div>
                ) : cameraLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 bg-gray-800">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-6xl leading-none flex items-center justify-center"
                    >
                      📹
                    </motion.div>
                    <p className="text-white font-baloo text-xl font-bold">Starting camera...</p>
                    <p className="text-gray-400 text-sm">This may take a few seconds</p>
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
                        className="border-4 border-white border-dashed rounded-lg w-[420px] h-[120px] opacity-80"
                      />
                    </div>
                  </>
                )}
              </div>

              {cameraActive && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex gap-3 justify-center"
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

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-3"
                >
                  <div className="p-4 bg-red-100 border-2 border-red-400 rounded-lg">
                    <div className="text-red-700 font-bold mb-2">{error}</div>
                    <div className="bg-white rounded-lg p-3 mt-3">
                      <p className="font-bold text-gray-800 text-sm mb-2">Troubleshooting:</p>
                      <ul className="text-xs text-gray-700 space-y-1">
                        <li>Allow camera permissions when prompted</li>
                        <li>Refresh the page after allowing permissions</li>
                        <li>Hold the camera steady</li>
                        <li>Use good lighting for documents</li>
                        <li>Keep text centered and readable</li>
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
                  <Card className="bg-gradient-to-br from-[#FF9126] to-[#FF9126] border-4 border-[#FF9126]">
                    <div className="text-center">
                      <div className="text-5xl mb-3 leading-none flex items-center justify-center">✨</div>
                      <h3 className="font-baloo text-2xl font-bold text-gray-800 mb-2">
                        Translation Ready!
                      </h3>

                      <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                        {scanResult.confidence === 'manual' ? 'Manual Input' : 'Camera OCR'}
                      </p>

                      <div className="bg-white rounded-lg p-4 mb-4 text-left">
                        <p className="text-gray-600 font-semibold mb-1">Detected Text:</p>
                        <p className="text-lg font-bold text-gray-800 mb-4 break-words whitespace-pre-wrap">
                          {scanResult.detectedText}
                        </p>

                        <p className="text-gray-600 font-semibold mb-1">
                          {appState.targetLanguage}:
                        </p>

                        {/* ✅ YOUR NEW BLOCK */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-2xl font-bold text-primary">
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
                            <div className="mt-2 text-sm text-gray-500">
                              <p className="italic">
                                Translation is not available right now.
                              </p>
                              <p className="text-xs text-gray-400">
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
                        <Button variant="outline" onClick={() => setScanResult(null)}>
                          ✖️
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <Card className="bg-gradient-to-br from-blue-100 to-cyan-100 border-2 border-blue-300">
              <h3 className="mb-3 flex items-center gap-2 font-baloo text-xl font-bold text-gray-800">
                <span>⌨️</span>
                Manual Text Translate
              </h3>
              <p className="mb-3 text-sm font-semibold text-gray-700">
                If camera OCR is slow or unclear, type the text manually and translate it instantly.
              </p>

              <div className="flex flex-col gap-3">
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Type or paste text here..."
                  rows={4}
                  className="w-full rounded-2xl border-2 border-blue-300 px-4 py-3 font-semibold text-gray-800 outline-none transition-all focus:border-blue-500 resize-none"
                />

                <Button
                  variant="secondary"
                  onClick={translateManualText}
                  disabled={isScanning}
                >
                  {isScanning ? '⏳ Translating...' : '⚡ Translate Text'}
                </Button>
              </div>
            </Card>

            <Card>
              <h3 className="font-baloo text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>📝</span>
                Scanned Text ({savedScans.length})
              </h3>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {savedScans.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
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
                      className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-3"
                    >
                      <p className="font-bold text-gray-800 text-sm mb-1 break-words whitespace-pre-wrap">
                        {item.detectedText}
                      </p>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-primary font-bold text-lg break-words whitespace-pre-wrap flex-1">
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
                  className="w-full mt-4"
                >
                  View Full Collection 🎒
                </Button>
              )}
            </Card>

            <Card className="bg-gradient-to-br from-yellow-100 to-orange-100">
              <h4 className="font-baloo text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                <span>💡</span>
                Quick Tips
              </h4>
              <ul className="space-y-2 text-sm font-semibold text-gray-700">
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
        </div>
      </div>

      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUpgradeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full"
            >
              <Card className="bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 border-4 border-yellow-300 shadow-2xl">
                <div className="text-center text-white">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                    className="text-8xl mb-4 leading-none flex items-center justify-center"
                  >
                    🚫
                  </motion.div>

                  <h2 className="font-baloo text-3xl font-bold mb-4">
                    Need More Batteries?
                  </h2>

                  <p className="text-lg mb-6 opacity-90">
                    Free learners get 5 batteries, and every lesson mistake removes 1. Upgrade to <strong>Unlimited Batteries</strong> for stress-free practice!
                  </p>

                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="text-3xl leading-none flex items-center justify-center">✨</span>
                      <h3 className="font-bold text-xl">Premium Features</h3>
                      <span className="text-3xl leading-none flex items-center justify-center">✨</span>
                    </div>
                    <ul className="text-left space-y-2 text-sm">
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
                      className="w-full bg-white text-purple-600 font-bold py-4 rounded-xl shadow-lg hover:bg-yellow-100 transition-colors"
                    >
                      <span className="flex items-center justify-center gap-2 text-lg">
                        <span>🚀</span>
                        Unlock Unlimited Batteries
                        <span>🔋</span>
                      </span>
                    </motion.button>

                    <button
                      onClick={() => setShowUpgradeModal(false)}
                      className="w-full text-white/80 hover:text-white font-semibold py-2 transition-colors text-sm"
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
