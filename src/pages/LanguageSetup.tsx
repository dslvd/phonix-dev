import { useState } from "react";
import { motion } from "framer-motion";
import Button from "../components/Button";
import Card from "../components/Card";
import NavigationHeader from "../components/NavigationHeader";
import { Page, AppState } from "../App";

interface LanguageSetupProps {
  navigate: (page: Page) => void;
  updateState: (updates: Partial<AppState>) => void;
}

export default function LanguageSetup({ navigate, updateState }: LanguageSetupProps) {
  const [nativeLanguage] = useState("English");
  const [targetLanguage] = useState("Hiligaynon");

  const handleSubmit = () => {
    updateState({ nativeLanguage, targetLanguage });
    navigate("mode");
  };

  return (
    <div className="min-h-screen">
      <NavigationHeader
        onBack={() => navigate("landing")}
        onLogout={() => navigate("landing")}
        showStats={false}
      />

      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="mb-2 font-baloo text-4xl font-bold">Language Setup</h1>
            <p className="theme-text-soft">Your learning path is set to English to Hiligaynon.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="theme-bg-surface rounded-2xl border px-6 py-4">
              <p className="theme-text-soft text-sm font-semibold">I speak</p>
              <p className="mt-1 text-lg font-bold">English</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <div className="theme-bg-surface rounded-2xl border px-6 py-4">
              <p className="theme-text-soft text-sm font-semibold">I want to learn</p>
              <p className="mt-1 text-lg font-bold">Hiligaynon</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button variant="primary" size="lg" fullWidth onClick={handleSubmit}>
              LET'S GO!
            </Button>
          </motion.div>
        </Card>
      </div>
    </div>
  );
}
