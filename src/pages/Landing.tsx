import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
import { Page } from '../App';

interface LandingProps {
  navigate: (page: Page) => void;
  resetAppState: () => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

export default function Landing({ navigate, resetAppState }: LandingProps) {
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    // Load Google Identity Services
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && clientId && googleButtonRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
          });
          
          window.google.accounts.id.renderButton(
            googleButtonRef.current,
            { 
              theme: 'outline', 
              size: 'large',
              width: 350,
              text: 'continue_with',
              shape: 'rectangular',
            }
          );
        } catch (error) {
          console.error('Google Sign-In error:', error);
          console.log('💡 To fix: Add http://localhost:3000 to authorized origins in Google Cloud Console');
        }
      }
    };
    script.onerror = () => {
      console.error('Failed to load Google Sign-In');
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [clientId]);

  const handleCredentialResponse = (response: any) => {
    // Decode JWT token
    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      console.log('Google Sign-In successful:', payload);

      resetAppState();
      
      // Store user data (you can expand this)
      localStorage.setItem('user', JSON.stringify({
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
      }));
      
      // Navigate to setup
      navigate('setup');
    } catch (error) {
      console.error('Error parsing credential:', error);
    }
  };

  const handleGuestLogin = () => {
    resetAppState();
    localStorage.setItem('user', JSON.stringify({
      name: 'Guest',
      email: '',
      picture: null,
    }));
    navigate('setup');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(72,187,255,0.08),transparent_30%),#0f1b24] p-4 text-slate-100">
      {/* Floating cloud decorations */}
      <motion.div
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute top-10 left-10 text-6xl opacity-30"
      >
        ☁️
      </motion.div>
      <motion.div
        animate={{ y: [0, -15, 0], x: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute top-20 right-20 text-5xl opacity-25"
      >
        ☁️
      </motion.div>
      <motion.div
        animate={{ y: [0, -25, 0] }}
        transition={{ duration: 7, repeat: Infinity }}
        className="absolute bottom-20 left-1/4 text-7xl opacity-20"
      >
        ☁️
      </motion.div>

      <Card className="max-w-md w-full animate-pop">
        {/* Logo with wooden sign style */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="inline-block"
          >
            <div className="mb-4 rounded-3xl border-b-4 border-[#FF9126] bg-gradient-to-b from-[#FF9126] to-[#FF9126] p-6 shadow-2xl">
              <div className="flex items-center justify-center gap-3">
                <span className="text-5xl leading-none flex items-center justify-center">🦜</span>
                <h1 className="font-baloo text-5xl font-bold text-white text-shadow leading-none">
                  Pho<span className="text-yellow-300">nix</span>
                </h1>
              </div>
            </div>
          </motion.div>
          <p className="text-sm font-semibold text-[#8bb1c7]">
            Learn Filipino languages the fun way
          </p>
        </div>

        {/* Sign In Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-4"
        >
          {/* Google Sign-In Button Container */}
          <div 
            ref={googleButtonRef} 
            className="flex justify-center mb-4"
            style={{ minHeight: '44px' }}
          />
          
          {/* Development Note for OAuth 403 Error */}
          {import.meta.env.DEV && (
            <div className="mb-4 rounded-xl border border-[#2a4151] bg-[#122733] p-3 text-xs">
              <p className="mb-1 font-bold text-[#7ed6ff]">Google Sign-In Setup (Development)</p>
              <p className="text-[#8bb1c7]">
                If you see a 403 error, add <code className="rounded bg-[#1a3242] px-1">http://localhost:3000</code> to authorized origins in{' '}
                <a 
                  href="https://console.cloud.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline font-bold"
                >
                  Google Cloud Console
                </a>
              </p>
              <p className="mt-1 text-[#8bb1c7]">Or just use <strong>Guest Login</strong> below.</p>
            </div>
          )}
          
          {/* Manual Google Button (fallback if no Client ID) */}
          {!clientId && (
            <div className="mb-4 cursor-pointer rounded-2xl border border-[#2a4151] bg-[#122733] p-3 text-center transition-all hover:border-[#56b8e8]">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span className="font-bold text-[#dff1ff]">Continue with Google</span>
              </div>
              <p className="mt-2 text-xs text-[#8bb1c7]">Add your Google Client ID in .env to enable</p>
            </div>
          )}

          {/* Separator */}
          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-[#2a4151]"></div>
            <span className="px-4 text-sm font-semibold text-[#7fa2b8]">or</span>
            <div className="flex-1 border-t border-[#2a4151]"></div>
          </div>

          {/* Guest Login Button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleGuestLogin}
            icon="🚀"
          >
            Start as Guest
          </Button>
        </motion.div>

        {/* Feature Icons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mb-8 flex justify-around rounded-2xl border border-[#2a4151] bg-[#122733] py-4"
        >
          <div className="text-center">
            <div className="text-4xl mb-2 leading-none flex items-center justify-center">📖</div>
            <p className="text-xs font-bold text-[#dff1ff]">Read</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2 leading-none flex items-center justify-center">👂</div>
            <p className="text-xs font-bold text-[#dff1ff]">Listen</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2 leading-none flex items-center justify-center">🎓</div>
            <p className="text-xs font-bold text-[#dff1ff]">Learn</p>
          </div>
        </motion.div>

        {/* Mascot Message */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <div className="relative inline-block rounded-2xl border border-[#2a4151] bg-[#122733] px-6 py-3 text-white shadow-lg">
            <p className="font-bold text-sm">
              Beep! Boop! Beep! Hello friends! Let's learn!
            </p>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: 1 }}
              className="text-4xl mt-2 leading-none flex items-center justify-center"
            >
              🤖
            </motion.div>
          </div>
        </motion.div>
      </Card>
    </div>
  );
}
