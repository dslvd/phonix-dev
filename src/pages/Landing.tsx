import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Page } from '../App';

interface LandingProps {
  navigate: (page: Page) => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

export default function Landing({ navigate }: LandingProps) {
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
    localStorage.setItem('user', JSON.stringify({
      name: 'Guest',
      email: '',
      picture: null,
    }));
    navigate('setup');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="inline-block"
          >
            <div className="text-5xl leading-none flex items-center justify-center mb-3">🦜</div>
            <h1 className="text-4xl font-bold text-white leading-none">
              Phonix
            </h1>
          </motion.div>
          <p className="text-gray-400 text-sm mt-3">
            Learn Filipino languages
          </p>
        </div>

        {/* Sign In Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 space-y-4"
        >
          {/* Google Sign-In Button Container */}
          <div 
            ref={googleButtonRef} 
            className="flex justify-center"
            style={{ minHeight: '44px' }}
          />
          
          {/* Fallback Login Method */}
          <button
            onClick={handleGuestLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Continue as Guest 👤
          </button>
        </motion.div>
      </div>
    </div>
  );
}
