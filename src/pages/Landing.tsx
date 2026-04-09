import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Button from "../components/Button";
import Card from "../components/Card";
import { Page } from "../App";

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
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && clientId && googleButtonRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
          });

          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: "outline",
            size: "large",
            width: 350,
            text: "continue_with",
            shape: "rectangular",
          });
        } catch (error) {
          console.error("Google Sign-In error:", error);
          console.log(
            "💡 To fix: Add http://localhost:3000 to authorized origins in Google Cloud Console",
          );
        }
      }
    };
    script.onerror = () => {
      console.error("Failed to load Google Sign-In");
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
      const payload = JSON.parse(atob(response.credential.split(".")[1]));
      console.log("Google Sign-In successful:", payload);

      // Store user data (you can expand this)
      localStorage.setItem(
        "user",
        JSON.stringify({
          name: payload.name,
          email: payload.email,
          picture: payload.picture,
        }),
      );

      resetAppState();

      // Navigate to setup
      navigate("setup");
    } catch (error) {
      console.error("Error parsing credential:", error);
    }
  };

  const handleGuestLogin = () => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        name: "Guest",
        email: "",
        picture: null,
      }),
    );
    resetAppState();
    navigate("setup");
  };

  return (
    // Landing Page Container
    <div className="relative flex h-screen items-center justify-center overflow-hidden p-4">
      {/* Floating pipin decoration */}
      <motion.div
        animate={{ y: [10, -10, 10] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 -translate-y-1/2 left-[15%] w-80 h-80 object-contain"
      >
        <img src="../../assets/PipinRocket.png" />
      </motion.div>

      {/* Login Card */}
      <Card className="max-w-lg w-full animate-pop ml-auto mr-6">
        <div className="text-center mb-8">
          <div className="inline-block">
            <div className="mb-4 p-2">
              <h1 className="font-baloo text-5xl font-bold leading-none text-[#FF9126]">Phonix</h1>
            </div>
          </div>
          <p className="text-sm font-semibold text-[#8bb1c7]">
            Learn Filipino languages the fun way
          </p>
        </div>

        {/* Sign In / Guest Access Section */}
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
            style={{ minHeight: "44px" }}
          />

          {/* Development Note for OAuth 403 Error */}
          {import.meta.env.DEV && (
            <div className="theme-bg-surface mb-4 rounded-xl border p-3 text-xs">
              <p className="mb-1 font-bold text-[#56b8e8]">Google Sign-In Setup (Development)</p>
              <p className="theme-text-soft">
                If you see a 403 error, add{" "}
                <code className="rounded bg-[color:var(--bg)] px-1">
                  http://localhost:3000
                </code>{" "}
                to authorized origins in{" "}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-bold"
                >
                  Google Cloud Console
                </a>
              </p>
              <p className="theme-text-soft mt-1">
                Or just use <strong>Guest Login</strong> below.
              </p>
            </div>
          )}

          {/* Manual Google Button (fallback if no Client ID) */}
          {!clientId && (
            <div className="theme-bg-surface mb-4 cursor-pointer rounded-2xl border p-3 text-center transition-all hover:border-[#56b8e8]">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span className="font-bold">Continue with Google</span>
              </div>
              <p className="theme-text-soft mt-2 text-xs">
                Add your Google Client ID in .env to enable
              </p>
            </div>
          )}

          {/* Separator */}
          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-[color:var(--border)]"></div>
            <span className="theme-text-soft px-4 text-sm font-semibold">or</span>
            <div className="flex-1 border-t border-[color:var(--border)]"></div>
          </div>

          {/* Guest Login Button */}
          <Button variant="primary" size="lg" fullWidth onClick={handleGuestLogin} icon="🚀">
            Start as Guest
          </Button>
        </motion.div>

        {/* Feature Preview Chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mb-8 grid grid-cols-3 gap-2"
        >
          <div className="theme-bg-surface rounded-xl border px-2 py-2 text-center">
            <div className="mx-auto flex h-7 w-7 items-center justify-center text-base leading-none">
              📖
            </div>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em]">Read</p>
            <p className="theme-text-soft text-[10px]">Quick lessons</p>
          </div>
          <div className="theme-bg-surface rounded-xl border px-2 py-2 text-center">
            <div className="mx-auto flex h-7 w-7 items-center justify-center text-base leading-none">
              👂
            </div>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em]">Listen</p>
            <p className="theme-text-soft text-[10px]">Hear words</p>
          </div>
          <div className="theme-bg-surface rounded-xl border px-2 py-2 text-center">
            <div className="mx-auto flex h-7 w-7 items-center justify-center text-base leading-none">
              🎓
            </div>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em]">Learn</p>
            <p className="theme-text-soft text-[10px]">Build streak</p>
          </div>
        </motion.div>
      </Card>
    </div>
  );
}
