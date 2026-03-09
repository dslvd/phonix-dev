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

interface DetectedObject {
  object: string;
  translation: string;
  confidence: string;
}

export default function ScanMode({ navigate, appState, updateState }: ScanModeProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedObject, setDetectedObject] = useState<DetectedObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedWords, setSavedWords] = useState<DetectedObject[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      setCameraLoading(true);
      console.log('🎥 Starting camera...');
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera not supported in this browser. Try Chrome, Firefox, or Safari.');
        setCameraLoading(false);
        return;
      }

      // Try back camera first (for mobile), fallback to any camera
      let stream: MediaStream | null = null;
      try {
        console.log('📱 Trying back camera...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false,
        });
      } catch (err) {
        console.log('🔄 Back camera not available, trying any camera...');
        // Fallback to any available camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false,
        });
      }
      
      console.log('✅ Camera stream obtained:', stream);
      console.log('📹 Video tracks:', stream.getVideoTracks());
      
      if (stream) {
        streamRef.current = stream;
        
        // Wait a bit for React to render the video element
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (videoRef.current) {
          console.log('🎬 Setting video source...');
          videoRef.current.srcObject = stream;
          
          // Wait for video to be ready and play
          videoRef.current.onloadedmetadata = async () => {
            console.log('📊 Video metadata loaded');
            try {
              await videoRef.current?.play();
              console.log('▶️ Video playing!');
              setCameraActive(true);
              setCameraLoading(false);
            } catch (playErr) {
              console.error('Play error:', playErr);
              setError('❌ Failed to start video playback. Try clicking the video to play it.');
              setCameraLoading(false);
            }
          };
        } else {
          console.error('❌ Video ref still null after waiting');
          setError('❌ Video element not ready. Please try again.');
          setCameraLoading(false);
          // Clean up stream
          stream.getTracks().forEach(track => track.stop());
        }
      } else {
        console.error('❌ No stream obtained');
        setError('❌ Failed to access camera.');
        setCameraLoading(false);
      }
    } catch (err: any) {
      console.error('❌ Camera error:', err);
      setCameraLoading(false);
      
      // Provide specific error messages
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('❌ Camera permission denied. Please allow camera access in your browser settings and refresh.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('❌ No camera found. Please connect a camera and try again.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('❌ Camera is already in use by another app. Close other apps and try again.');
      } else if (err.name === 'OverconstrainedError') {
        setError('❌ Camera constraints not supported. Try a different device.');
      } else if (err.name === 'SecurityError') {
        setError('❌ Camera access blocked. Make sure you\'re using HTTPS or localhost.');
      } else {
        setError(`❌ Camera error: ${err.message || 'Unknown error'}. Try refreshing the page.`);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Check scan limits for non-premium users
    if (!appState.isPremium && appState.scansRemaining <= 0) {
      setShowUpgradeModal(true);
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      // Capture image from video
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Convert base64 to blob for API
      const base64Data = imageData.split(',')[1];
      
      // Call Google Gemini Vision API
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setError('Gemini API key not configured');
        setIsScanning(false);
        return;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: `Identify the main object in this image in English. Then translate it to ${appState.targetLanguage}. Format: "Object: [name] | Translation: [${appState.targetLanguage} word]" Keep it simple and concise.` },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Data
                  }
                }
              ]
            }]
          })
        }
      );

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const text = data.candidates[0].content.parts[0].text;
        
        // Parse response
        const objectMatch = text.match(/Object:\s*([^|]+)/i);
        const translationMatch = text.match(/Translation:\s*(.+)/i);
        
        if (objectMatch && translationMatch) {
          const result = {
            object: objectMatch[1].trim(),
            translation: translationMatch[1].trim(),
            confidence: 'high'
          };
          setDetectedObject(result);
          
          // Decrement scans for non-premium users
          if (!appState.isPremium) {
            updateState({ scansRemaining: appState.scansRemaining - 1 });
          }
          
          // Play sound effect (optional)
          playSuccessSound();
        } else {
          // If parsing fails, show the raw response
          setDetectedObject({
            object: 'Detected',
            translation: text,
            confidence: 'medium'
          });
          
          // Still decrement for non-premium
          if (!appState.isPremium) {
            updateState({ scansRemaining: appState.scansRemaining - 1 });
          }
        }
      } else {
        setError('Could not identify object. Try again with better lighting.');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze image. Check your connection.');
    } finally {
      setIsScanning(false);
    }
  };

  const playSuccessSound = () => {
    // Create a simple success beep
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  const saveWord = () => {
    if (!detectedObject) return;
    
    setSavedWords(prev => [detectedObject, ...prev]);
    
    // Add to learned words in app state
    if (!appState.learnedWords.includes(detectedObject.translation)) {
      updateState({
        learnedWords: [...appState.learnedWords, detectedObject.translation],
        stars: appState.stars + 1
      });
    }
    
    setDetectedObject(null);
  };

  const speakWord = (text: string, language: string = 'fil-PH') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.75;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Try to find a Filipino voice
      const voices = window.speechSynthesis.getVoices();
      const filipinoVoice = voices.find(voice => 
        voice.lang.includes('fil') || voice.lang.includes('tl') || voice.lang.includes('PH')
      );
      
      if (filipinoVoice) {
        utterance.voice = filipinoVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    // Cleanup camera on unmount
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
      />

      <div className="max-w-4xl mx-auto p-4 mt-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="font-baloo text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            <span>📸</span>
            Scan Mode
            <span>🤖</span>
          </h1>
          <p className="text-gray-600 font-semibold">
            Point your camera at objects to learn instantly!
          </p>
        </motion.div>

        {/* Energy Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card className="bg-white/90 backdrop-blur-xl border-2 border-purple-300">
            <EnergyBar
              current={appState.scansRemaining}
              max={20}
              isPremium={appState.isPremium}
              onUpgrade={() => navigate('premium')}
            />
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Camera View */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="relative">
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
                {/* Always render video element, just hide it */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${
                    cameraActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                
                {!cameraActive && !cameraLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 p-4">
                    <div className="text-6xl animate-bounce leading-none flex items-center justify-center">📷</div>
                    <h3 className="text-white font-baloo text-xl font-bold text-center">
                      Ready to Scan Objects?
                    </h3>
                    <Button
                      variant="primary"
                      onClick={startCamera}
                      className="text-lg px-8 py-3"
                    >
                      🎥 Start Camera
                    </Button>
                    <div className="text-white text-xs px-4 text-center space-y-1 bg-gray-800/50 rounded-lg p-3">
                      <p className="font-bold">📱 You'll be asked for camera permission</p>
                      <p className="text-gray-300">Point at objects → AI translates instantly!</p>
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
                    
                {/* Scanning overlay - show when camera is active and scanning */}
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
                            Analyzing...
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Center guide frame */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="border-4 border-white border-dashed rounded-lg w-64 h-64 opacity-50" />
                    </div>
                  </>
                )}
              </div>

              {/* Camera Controls */}
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
                    {isScanning ? '⏳ Scanning...' : '📸 Scan Object'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={stopCamera}
                  >
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
                    <div className="text-red-700 font-bold mb-2">
                      {error}
                    </div>
                    <div className="bg-white rounded-lg p-3 mt-3">
                      <p className="font-bold text-gray-800 text-sm mb-2">🔧 Troubleshooting:</p>
                      <ul className="text-xs text-gray-700 space-y-1">
                        <li>✓ Allow camera permissions when prompted</li>
                        <li>✓ Refresh the page after allowing permissions</li>
                        <li>✓ Close other apps using your camera</li>
                        <li>✓ Use Chrome, Firefox, or Safari browser</li>
                        <li>✓ Check if camera works in other apps</li>
                      </ul>
                      <Button
                        variant="primary"
                        onClick={startCamera}
                        className="w-full mt-3 text-sm"
                      >
                        🔄 Try Again
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Hidden canvas for image capture */}
              <canvas ref={canvasRef} className="hidden" />
            </Card>
          </motion.div>

          {/* Results & History */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {/* Current Detection */}
            <AnimatePresence>
              {detectedObject && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                >
                  <Card className="bg-gradient-to-br from-green-100 to-emerald-200 border-4 border-green-400">
                    <div className="text-center">
                      <div className="text-5xl mb-3 leading-none flex items-center justify-center">✨</div>
                      <h3 className="font-baloo text-2xl font-bold text-gray-800 mb-2">
                        Found!
                      </h3>
                      <div className="bg-white rounded-lg p-4 mb-4">
                        <p className="text-gray-600 font-semibold mb-1">English:</p>
                        <p className="text-2xl font-bold text-gray-800 mb-3">
                          {detectedObject.object}
                        </p>
                        <p className="text-gray-600 font-semibold mb-1">
                          {appState.targetLanguage}:
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-3xl font-bold text-primary">
                            {detectedObject.translation}
                          </p>
                          <button
                            onClick={() => speakWord(detectedObject.translation)}
                            className="text-3xl hover:scale-110 transition-transform leading-none flex items-center justify-center flex-shrink-0"
                          >
                            🔊
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="success"
                          onClick={saveWord}
                          className="flex-1"
                        >
                          💾 Save to Collection
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setDetectedObject(null)}
                        >
                          ✖️
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Saved Words History */}
            <Card>
              <h3 className="font-baloo text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>🎒</span>
                Scanned Words ({savedWords.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {savedWords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2 leading-none flex items-center justify-center">👀</div>
                    <p className="font-semibold">No words scanned yet!</p>
                    <p className="text-sm">Start scanning objects around you</p>
                  </div>
                ) : (
                  savedWords.map((word, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{word.object}</p>
                        <p className="text-primary font-bold text-lg">{word.translation}</p>
                      </div>
                      <button
                        onClick={() => speakWord(word.translation)}
                        className="text-2xl hover:scale-110 transition-transform leading-none flex items-center justify-center flex-shrink-0"
                      >
                        🔊
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
              {savedWords.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => navigate('collection')}
                  className="w-full mt-4"
                >
                  View Full Collection 🎒
                </Button>
              )}
            </Card>

            {/* Quick Tips */}
            <Card className="bg-gradient-to-br from-yellow-100 to-orange-100">
              <h4 className="font-baloo text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                <span>💡</span>
                Quick Tips
              </h4>
              <ul className="space-y-2 text-sm font-semibold text-gray-700">
                <li className="flex gap-2">
                  <span>✨</span>
                  <span>Point camera at clear, well-lit objects</span>
                </li>
                <li className="flex gap-2">
                  <span>📷</span>
                  <span>Center the object in the frame</span>
                </li>
                <li className="flex gap-2">
                  <span>🔊</span>
                  <span>Tap speaker icon to hear pronunciation</span>
                </li>
                <li className="flex gap-2">
                  <span>💾</span>
                  <span>Save words to practice later</span>
                </li>
              </ul>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Upgrade Modal */}
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
                    Out of Scan Energy!
                  </h2>
                  
                  <p className="text-lg mb-6 opacity-90">
                    You've used all your free scans. Upgrade to <strong>Unlimited Magic</strong> for endless scanning!
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
                        <span>Unlimited scans forever</span>
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
                        Unlock Unlimited Magic
                        <span>✨</span>
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
