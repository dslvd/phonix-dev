import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VocabularyItem } from "../data/vocabulary";
import Card from "./Card";

interface QuizProps {
  currentWord: VocabularyItem;
  allWords: VocabularyItem[];
  onAnswer: (correct: boolean) => void;
  targetLanguage?: string;
  nativeLanguage?: string;
  useAI?: boolean;
  difficultyBand?: "beginner" | "intermediate" | "advanced";
  levelStage?: number;
}

interface AIQuizPayload {
  question?: string;
  correctFeedback?: string;
  incorrectFeedback?: string;
  options?: Array<{
    nativeWord?: string;
    englishWord?: string;
    emoji?: string;
    isCorrect?: boolean;
  }>;
}

const aiQuizCache = new Map<string, AIQuizPayload>();
const quizOptionsCache = new Map<string, VocabularyItem[]>();

const stripCodeFence = (text: string) =>
  text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

const parseAIQuizPayload = (rawText: string): AIQuizPayload | null => {
  const cleaned = stripCodeFence(rawText);

  try {
    return JSON.parse(cleaned) as AIQuizPayload;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as AIQuizPayload;
    } catch {
      return null;
    }
  }
};

export default function Quiz({
  currentWord,
  allWords,
  onAnswer,
  targetLanguage = "Hiligaynon",
  nativeLanguage = "English",
  useAI = true,
  difficultyBand,
  levelStage = 1,
}: QuizProps) {
  const [options, setOptions] = useState<VocabularyItem[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [challengeText, setChallengeText] = useState("");
  const [correctText, setCorrectText] = useState("");
  const [incorrectText, setIncorrectText] = useState("");
  const answerTimeoutRef = useRef<number | null>(null);

  const getSpeechLang = (language: string, fallback: string) => {
    const value = (language || "").trim().toLowerCase();
    if (!value) {
      return fallback;
    }

    if (value.includes("hiligaynon") || value.includes("filipino") || value.includes("tagalog")) {
      return "fil-PH";
    }

    if (value.includes("english")) {
      return "en-US";
    }

    return fallback;
  };

  const pickVoiceForLang = (voices: SpeechSynthesisVoice[], langCode: string) => {
    const lowerLang = langCode.toLowerCase();

    if (lowerLang.startsWith("fil")) {
      return (
        voices.find((voice) => {
          const voiceLang = voice.lang.toLowerCase();
          return (
            voiceLang.startsWith("fil") ||
            voiceLang.startsWith("tl") ||
            voiceLang.includes("ph")
          );
        }) || null
      );
    }

    if (lowerLang.startsWith("en")) {
      return voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) || null;
    }

    return voices.find((voice) => voice.lang.toLowerCase().startsWith(lowerLang.split("-")[0])) || null;
  };

  const speakText = (text: string, language: string, fallbackLang: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = getSpeechLang(language, fallbackLang);
    utterance.rate = 0.9;
    utterance.pitch = 0.9;
    utterance.volume = 1;

    const speakWithVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = pickVoiceForLang(voices, utterance.lang);
      const englishFallback = voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) || null;
      utterance.voice = preferred || englishFallback || voices[0] || null;
      window.speechSynthesis.speak(utterance);
    };

    const availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        speakWithVoice();
      };
      return;
    }

    speakWithVoice();
  };

  const challengeLines = [
    "What is this in Hiligaynon?",
    "Which Hiligaynon word matches this?",
    "Pick the correct Hiligaynon answer.",
    "Can you identify the right word?",
  ];
  const correctLines = [
    "Correct! Great job!",
    "Nice one! You got it right.",
    "Well done! That is correct.",
    "Great answer! Keep going.",
  ];
  const incorrectLines = [
    "Not quite! Keep practicing!",
    "Almost. Try the next one.",
    "Good try. Let us keep practicing.",
    "Close. You will get the next one.",
  ];

  useEffect(() => {
    setSelectedAnswer(null);
    setShowResult(false);

    const fallbackChallenge =
      challengeLines[currentWord.englishWord.length % challengeLines.length];
    const fallbackCorrect = correctLines[currentWord.nativeWord.length % correctLines.length];
    const fallbackIncorrect = incorrectLines[currentWord.id.length % incorrectLines.length];

    setChallengeText(fallbackChallenge);
    setCorrectText(fallbackCorrect);
    setIncorrectText(fallbackIncorrect);

    const optionsCacheKey = [currentWord.id, allWords.map((word) => word.id).join(",")].join("|");

    const setLocalOptions = () => {
      const cachedOptions = quizOptionsCache.get(optionsCacheKey);
      if (cachedOptions) {
        setOptions(cachedOptions);
        return;
      }

      const shuffledPool = [...allWords]
        .filter((word) => word.id !== currentWord.id)
        .sort(() => Math.random() - 0.5);
      const wrongOptions = shuffledPool.slice(0, 3);
      const localOptions = [currentWord, ...wrongOptions].sort(() => Math.random() - 0.5);

      quizOptionsCache.set(optionsCacheKey, localOptions);
      setOptions(localOptions);
    };

    const applyAIText = (payload: AIQuizPayload) => {
      if (payload.question?.trim()) {
        setChallengeText(payload.question.trim());
      }
      if (payload.correctFeedback?.trim()) {
        setCorrectText(payload.correctFeedback.trim());
      }
      if (payload.incorrectFeedback?.trim()) {
        setIncorrectText(payload.incorrectFeedback.trim());
      }

      return !!(
        payload.question?.trim() ||
        payload.correctFeedback?.trim() ||
        payload.incorrectFeedback?.trim()
      );
    };

    let cancelled = false;

    // Always render quiz options immediately so users can answer without waiting for AI.
    setLocalOptions();

    const quizCacheKey = [
      currentWord.id,
      targetLanguage,
      nativeLanguage,
      difficultyBand || currentWord.difficulty,
      Math.max(1, Math.min(5, levelStage)),
    ].join("|");

    const cachedPayload = aiQuizCache.get(quizCacheKey);
    if (cachedPayload) {
      applyAIText(cachedPayload);
    }

    const buildAIQuiz = async () => {
      if (!useAI) {
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return;
      }

      try {
        const stageHint =
          levelStage <= 1
            ? "Stage 1: easier distractors are allowed."
            : levelStage === 2
              ? "Stage 2: use moderately similar distractors."
              : levelStage === 3
                ? "Stage 3: distractors should be close in category and meaning."
                : levelStage === 4
                  ? "Stage 4: distractors should be very close and tricky."
                  : "Stage 5: use highly confusable distractors with similar form and meaning.";

        const prompt = [
          "You are generating one multiple-choice language-learning quiz item.",
          `Difficulty level: ${currentWord.difficulty}.`,
          `Difficulty band: ${difficultyBand || currentWord.difficulty}.`,
          `Current stage: ${Math.max(1, Math.min(5, levelStage))} of 5.`,
          `Target language: ${targetLanguage}.`,
          `Learner native language: ${nativeLanguage}.`,
          `Correct answer in ${targetLanguage}: ${currentWord.nativeWord}.`,
          `Reference English word: ${currentWord.englishWord}.`,
          stageHint,
          "",
          "Return STRICT JSON only with this shape:",
          "{",
          '  "question": "string",',
          '  "correctFeedback": "string",',
          '  "incorrectFeedback": "string",',
          '  "options": [',
          '    { "nativeWord": "string", "englishWord": "string", "emoji": "string", "isCorrect": true|false }',
          "  ]",
          "}",
          "",
          "Rules:",
          "1. Provide exactly 4 options.",
          "2. Exactly one option must have isCorrect=true and it must be the same word as the correct answer.",
          "3. Wrong options must be plausible but clearly different from the correct answer.",
          "4. Keep all text concise and learner-friendly.",
        ].join("\n");

        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          throw new Error("ai-quiz-request-failed");
        }

        const data = await response.json();
        const payload = parseAIQuizPayload(String(data?.text || ""));

        if (!payload) {
          throw new Error("ai-quiz-invalid-options");
        }

        aiQuizCache.set(quizCacheKey, payload);

        if (!cancelled) {
          const applied = applyAIText(payload);
          if (!applied) {
            throw new Error("ai-quiz-empty-text-payload");
          }
        }
      } catch {
        // Keep instant local options when AI quiz generation is unavailable.
      }
    };

    buildAIQuiz();

    return () => {
      cancelled = true;
      if (answerTimeoutRef.current !== null) {
        window.clearTimeout(answerTimeoutRef.current);
        answerTimeoutRef.current = null;
      }
    };
  }, [
    currentWord.id,
    currentWord.nativeWord,
    currentWord.englishWord,
    currentWord.category,
    currentWord.difficulty,
    currentWord.emoji,
    targetLanguage,
    nativeLanguage,
    allWords,
    useAI,
    difficultyBand,
    levelStage,
  ]);

  useEffect(() => {
    // Auto-read the prompt word in the learner's response language each new question.
    speakText(currentWord.englishWord, nativeLanguage, "en-US");
  }, [currentWord.id, currentWord.englishWord, nativeLanguage]);

  const handleSelect = (word: VocabularyItem) => {
    if (showResult) return; // Prevent multiple selections

    speakText(word.nativeWord, targetLanguage, "fil-PH");

    setSelectedAnswer(word.id);
    setShowResult(true);

    const isCorrect = word.id === currentWord.id;

    // Delay to show result before moving to next
    if (answerTimeoutRef.current !== null) {
      window.clearTimeout(answerTimeoutRef.current);
    }

    answerTimeoutRef.current = window.setTimeout(() => {
      onAnswer(isCorrect);
      answerTimeoutRef.current = null;
    }, 1500);
  };

  const getButtonStyle = (word: VocabularyItem) => {
    if (!showResult) {
      return "theme-bg-surface border-2 border-[color:var(--border)] hover:border-[#FF9126] hover:shadow-lg";
    }

    if (word.id === currentWord.id) {
      return "theme-bg-surface border-2";
    }

    if (word.id === selectedAnswer && word.id !== currentWord.id) {
      return "border-2 border-red-500 bg-gradient-to-r from-red-100 to-rose-100 shadow-lg shadow-red-500/30";
    }

    return "theme-bg-surface border-2 border-[color:var(--border)] opacity-60";
  };

  return (
    // Quiz Component Container
    <div className="flex h-full min-h-0 flex-col justify-start gap-4 sm:gap-8">
      {/* Challenge Header */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <div className="mb-3 inline-block rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-1.5 shadow-lg sm:mb-4 sm:px-6 sm:py-2">
          <span className="flex items-center gap-2 font-baloo text-base font-bold leading-none sm:text-lg">
            <span className="text-2xl leading-none flex items-center justify-center">🎯</span>
            Quiz Challenge!
          </span>
        </div>
        <h3 className="mb-1 font-baloo text-xl font-bold sm:mb-2 sm:text-2xl">{challengeText}</h3>
      </motion.div>

      {/* Word Display */}
      <Card className="theme-bg-surface flex min-h-[14rem] flex-col justify-center border-2 border-[color:var(--border)] py-6 text-center sm:min-h-0 sm:py-12">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mb-2 flex items-center justify-center text-[88px] leading-none sm:mb-4 sm:text-[120px]"
        >
          {currentWord.emoji}
        </motion.div>
        <h2 className="font-baloo text-3xl font-bold sm:text-4xl">{currentWord.englishWord}</h2>
      </Card>

      {/* Multiple Choice Options */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 md:grid-cols-2 md:gap-4">
        <AnimatePresence mode="wait">
          {options.map((word, index) => (
            // Quiz Answer Option
            <motion.button
              key={word.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleSelect(word)}
              disabled={showResult}
              className={`${getButtonStyle(word)} rounded-2xl p-4 transition-all duration-300 disabled:cursor-not-allowed sm:p-6`}
            >
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="text-left flex-1">
                  <p className="font-baloo text-lg font-bold sm:text-2xl">{word.nativeWord}</p>
                </div>
                {showResult && word.id === currentWord.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center justify-center text-2xl leading-none sm:text-3xl"
                  >
                    ✅
                  </motion.div>
                )}
                {showResult && word.id === selectedAnswer && word.id !== currentWord.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center justify-center text-2xl leading-none sm:text-3xl"
                  >
                    ❌
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Result Message */}
      <AnimatePresence>
        {showResult && (
          // Result Feedback Panel
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            {selectedAnswer === currentWord.id ? (
              <Card className="theme-bg-surface border-2 py-4 sm:py-6">
                <div className="mb-2 flex items-center justify-center text-5xl leading-none sm:text-6xl">
                  🎉
                </div>
                <p className="font-baloo text-xl font-bold sm:text-2xl">{correctText}</p>
              </Card>
            ) : (
              <Card className="border-2 border-red-400 bg-gradient-to-r from-red-100 to-rose-100 py-4 sm:py-6">
                <div className="mb-2 flex items-center justify-center text-5xl leading-none sm:text-6xl">
                  💪
                </div>
                <p className="font-baloo text-xl font-bold text-red-700 sm:text-2xl">{incorrectText}</p>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
