import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
import NavigationHeader from '../components/NavigationHeader';
import EnergyBar from '../components/EnergyBar';
import { Page, AppState } from '../App';
import { analyzeImageWithAI, getFallbackScanResult } from '../lib/aiFallback';

// ─── Domain types ─────────────────────────────────────────────────────────────

interface DetectedObject {
  object: string;
  translation: string;
  confidence: string;
}

// ─── CameraController — encapsulates all camera / WebRTC logic ────────────────

class CameraController {
  private stream: MediaStream | null = null;

  async start(videoEl: HTMLVideoElement): Promise<void> {
    const constraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        ...constraints,
        video: { ...constraints.video, facingMode: 'environment' },
      });
    } catch {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    }

    videoEl.srcObject = this.stream;
    await new Promise<void>((resolve, reject) => {
      videoEl.onloadedmetadata = async () => {
        try {
          await videoEl.play();
          resolve();
        } catch (e) {
          reject(e);
        }
      };
    });
  }

  stop(videoEl?: HTMLVideoElement): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (videoEl) videoEl.srcObject = null;
  }

  capture(videoEl: HTMLVideoElement, canvasEl: HTMLCanvasElement): string {
    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;
    canvasEl.getContext('2d')!.drawImage(videoEl, 0, 0);
    const dataUrl = canvasEl.toDataURL('image/jpeg', 0.8);
    return dataUrl.split(',')[1]; // base64 only
  }

  get isActive(): boolean {
    return !!this.stream;
  }

  static parseCameraError(err: any): string {
    const map: Record<string, string> = {
      NotAllowedError: '❌ Camera permission denied. Please allow camera access and refresh.',
      PermissionDeniedError: '❌ Camera permission denied. Please allow camera access and refresh.',
      NotFoundError: '❌ No camera found. Please connect a camera and try again.',
      DevicesNotFoundError: '❌ No camera found. Please connect a camera and try again.',
      NotReadableError: '❌ Camera is already in use by another app.',
      TrackStartError: '❌ Camera is already in use by another app.',
      OverconstrainedError: '❌ Camera constraints not supported. Try a different device.',
      SecurityError: "❌ Camera access blocked. Make sure you're using HTTPS or localhost.",
    };
    return map[err?.name] ?? `❌ Camera error: ${err?.message || 'Unknown error'}. Try refreshing.`;
  }
}

// ─── SpeechService — encapsulates Web Speech API ─────────────────────────────

class SpeechService {
  static speak(text: string, lang = 'fil-PH'): void {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.75;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.includes('fil') || v.lang.includes('tl') || v.lang.includes('PH'),
    );
    if (preferred) utterance.voice = preferred;

    window.speechSynthesis.speak(utterance);
  }

  static playSuccessBeep(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // Audio not critical
    }
  }
}

// ─── ScanMode Component ───────────────────────────────────────────────────────

interface ScanModeProps {
  navigate: (page: Page) => void;
  appState: AppState;
  updateState: (updates: Partial<AppState>) => void;
}

export default function ScanMode({ navigate, appState, updateState }: ScanModeProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedObject, setDetectedObject] = useState<DetectedObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedWords, setSavedWords] = useState<DetectedObject[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [manualObject, setManualObject] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef(new CameraController());

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera not supported in this browser. Try Chrome, Firefox, or Safari.');
      return;
    }
    try {
      setError(null);
      setCameraLoading(true);
      await new Promise((r) => setTimeout(r, 100)); // wait for video ref to mount
      await cameraRef.current.start(videoRef.current!);
      setCameraActive(true);
    } catch (err: any) {
      setError(CameraController.parseCameraError(err));
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    cameraRef.current.stop(videoRef.current ?? undefined);
    setCameraActive(false);
    setCameraLoading(false);
  };

  const runSmartAssist = (label: string): boolean => {
    const fallback = getFallbackScanResult(label, appState.targetLanguage || 'Hiligaynon');
    if (!fallback) return false;
    setDetectedObject({ object: fallback.object, translation: fallback.translation, confidence: fallback.confidence });
    setError(null);
    return true;
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsScanning(true);
    setError(null);

    try {
      const base64 = cameraRef.current.capture(videoRef.current, canvasRef.current);
      const aiText = await analyzeImageWithAI(base64, appState.targetLanguage || 'Hiligaynon');

      if (!aiText) {
        if (manualObject.trim()) { runSmartAssist(manualObject); return; }
        setError('Cloud AI did not return a result. Use Smart Assist below.');
        return;
      }

      const objectMatch = aiText.match(/Object:\s*([^|]+)/i);
      const translationMatch = aiText.match(/Translation:\s*(.+)/i);

      if (objectMatch && translationMatch) {
        setDetectedObject({ object: objectMatch[1].trim(), translation: translationMatch[1].trim(), confidence: 'high' });
        SpeechService.playSuccessBeep();
      } else {
        setDetectedObject({ object: 'Detected', translation: aiText, confidence: 'medium' });
      }
    } catch {
      if (manualObject.trim()) { runSmartAssist(manualObject); }
      else setError('Failed to analyze image. Check your connection or use Smart Assist below.');
    } finally {
      setIsScanning(false);
    }
  };

  const saveWord = () => {
    if (!detectedObject) return;
    setSavedWords((prev) => [detectedObject, ...prev]);
    if (!appState.learnedWords.includes(detectedObject.translation)) {
      updateState({ learnedWords: [...appState.learnedWords, detectedObject.translation], stars: appState.stars + 1, totalXP: appState.totalXP + 12 });
    } else {
      updateState({ totalXP: appState.totalXP + 3 });
    }
    setDetectedObject(null);
  };

  useEffect(() => () => stopCamera(), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-pink-200 to-orange-200">
      <NavigationHeader
        onBack={() => { stopCamera(); navigate('dashboard'); }}
        onLogout={() => { stopCamera(); navigate('landing'); }}
        onProfile={() => navigate('profile')}
        showStats streakCount={appState.currentStreak} starCount={appState.stars}
      />

      <div className="max-w-4xl mx-auto p-4 mt-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <h1 className="font-baloo text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            <span>📸</span>Scan Mode<span>🤖</span>
          </h1>
          <p className="text-gray-600 font-semibold">Point your camera at objects to learn instantly!</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="mb-6">
          <Card className="bg-white/90 backdrop-blur-xl border-2 border-purple-300">
            <EnergyBar current={appState.heartsRemaining} max={5} isPremium={appState.isPremium} onUpgrade={() => setShowUpgradeModal(true)} />
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Camera */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <Card className="relative">
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
                <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${cameraActive ? 'opacity-100' : 'opacity-0'}`} />

                {!cameraActive && !cameraLoading && (
                  <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 p-4">
                    <div className="text-6xl animate-bounce leading-none flex items-center justify-center">📷</div>
                    <h3 className="text-white font-baloo text-xl font-bold text-center">Ready to Scan Objects?</h3>
                    <Button variant="primary" onClick={startCamera}>🎥 Start Camera</Button>
                    <div className="text-white text-xs px-4 text-center bg-gray-800/50 rounded-lg p-3">
                      <p className="font-bold">📱 You'll be asked for camera permission</p>
                      <p className="text-gray-300">Point at objects → AI translates instantly!</p>
                    </div>
                  </div>
                )}

                {cameraLoading && (
                  <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 bg-gray-800">
                    <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }} transition={{ duration: 2, repeat: Infinity }} className="text-6xl leading-none flex items-center justify-center">📹</motion.div>
                    <p className="text-white font-baloo text-xl font-bold">Starting camera...</p>
                  </div>
                )}

                {cameraActive && (
                  <>
                    <AnimatePresence>
                      {isScanning && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                          <div className="text-white text-2xl font-bold font-baloo flex items-center gap-3">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>🔍</motion.div>
                            Analyzing...
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="border-4 border-white border-dashed rounded-lg w-64 h-64 opacity-50" />
                    </div>
                  </>
                )}
              </div>

              {cameraActive && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex gap-3 justify-center">
                  <Button variant="primary" onClick={captureAndAnalyze} disabled={isScanning} className="flex-1">
                    {isScanning ? '⏳ Scanning...' : '📸 Scan Object'}
                  </Button>
                  <Button variant="outline" onClick={stopCamera}>⏹️</Button>
                </motion.div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-3">
                  <div className="p-4 bg-red-100 border-2 border-red-400 rounded-lg">
                    <div className="text-red-700 font-bold mb-2">{error}</div>
                    <Button variant="primary" onClick={startCamera} className="w-full mt-3 text-sm">🔄 Try Again</Button>
                  </div>
                </motion.div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </Card>
          </motion.div>

          {/* Results */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
            <AnimatePresence>
              {detectedObject && (
                <motion.div initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: -20 }}>
                  <Card className="bg-gradient-to-br from-green-100 to-emerald-200 border-4 border-green-400">
                    <div className="text-center">
                      <div className="text-5xl mb-3 leading-none flex items-center justify-center">✨</div>
                      <h3 className="font-baloo text-2xl font-bold text-gray-800 mb-2">Found!</h3>
                      <div className="bg-white rounded-lg p-4 mb-4">
                        <p className="text-gray-600 font-semibold mb-1">English:</p>
                        <p className="text-2xl font-bold text-gray-800 mb-3">{detectedObject.object}</p>
                        <p className="text-gray-600 font-semibold mb-1">{appState.targetLanguage}:</p>
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-3xl font-bold text-primary">{detectedObject.translation}</p>
                          <button onClick={() => SpeechService.speak(detectedObject.translation)} className="text-3xl hover:scale-110 transition-transform leading-none flex items-center justify-center">🔊</button>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="success" onClick={saveWord} className="flex-1">💾 Save to Collection</Button>
                        <Button variant="outline" onClick={() => setDetectedObject(null)}>✖️</Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Smart Assist */}
            <Card className="bg-gradient-to-br from-blue-100 to-cyan-100 border-2 border-blue-300">
              <h3 className="mb-3 flex items-center gap-2 font-baloo text-xl font-bold text-gray-800"><span>⚡</span>AI Alternative: Smart Assist</h3>
              <p className="mb-3 text-sm font-semibold text-gray-700">If cloud AI is slow, type what you see and translate instantly.</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input type="text" value={manualObject} onChange={(e) => setManualObject(e.target.value)} placeholder="Type object name, like cat, rice, dog..." className="flex-1 rounded-2xl border-2 border-blue-300 px-4 py-3 font-semibold text-gray-800 outline-none focus:border-blue-500" />
                <Button variant="secondary" onClick={() => { if (!manualObject.trim()) { setError('Type what you see first.'); return; } if (!runSmartAssist(manualObject)) setError('Smart Assist could not understand that. Try a simple word.'); }}>⚡ Translate Now</Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['cat', 'dog', 'rice', 'water', 'bird', 'mother'].map((item) => (
                  <button key={item} onClick={() => setManualObject(item)} className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50">{item}</button>
                ))}
              </div>
            </Card>

            {/* Saved words */}
            <Card>
              <h3 className="font-baloo text-xl font-bold text-gray-800 mb-3 flex items-center gap-2"><span>🎒</span>Scanned Words ({savedWords.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {savedWords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2 leading-none flex items-center justify-center">👀</div>
                    <p className="font-semibold">No words scanned yet!</p>
                  </div>
                ) : (
                  savedWords.map((word, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{word.object}</p>
                        <p className="text-primary font-bold text-lg">{word.translation}</p>
                      </div>
                      <button onClick={() => SpeechService.speak(word.translation)} className="text-2xl hover:scale-110 transition-transform leading-none flex items-center justify-center">🔊</button>
                    </motion.div>
                  ))
                )}
              </div>
              {savedWords.length > 0 && <Button variant="outline" onClick={() => navigate('collection')} className="w-full mt-4">View Full Collection 🎒</Button>}
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowUpgradeModal(false)}>
            <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 50 }} onClick={(e) => e.stopPropagation()} className="max-w-md w-full">
              <Card className="bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 border-4 border-yellow-300 shadow-2xl">
                <div className="text-center text-white">
                  <h2 className="font-baloo text-3xl font-bold mb-4">Need More Hearts?</h2>
                  <p className="text-lg mb-6 opacity-90">Upgrade to <strong>Unlimited Hearts</strong> for stress-free practice!</p>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setShowUpgradeModal(false); navigate('premium'); }} className="w-full bg-white text-purple-600 font-bold py-4 rounded-xl shadow-lg">
                    🚀 Unlock Unlimited Hearts 💖
                  </motion.button>
                  <button onClick={() => setShowUpgradeModal(false)} className="w-full text-white/80 hover:text-white font-semibold py-2 mt-3 text-sm">Maybe Later</button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
