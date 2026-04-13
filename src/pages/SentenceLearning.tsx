import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Card from "../components/Card";
import NavigationHeader from "../components/NavigationHeader";
import Mascot from "../components/Mascot";
import { Page, AppState, UpdateStateFn } from "../App";
import { sentenceData, vocabularyData } from "../data/vocabulary";

interface SentenceLearningProps {
  navigate: (page: Page) => void;
  openMobileNav?: () => void;
  appState: AppState;
  updateState: UpdateStateFn;
}

export default function SentenceLearning({
  navigate,
  openMobileNav,
  appState,
  updateState,
}: SentenceLearningProps) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (typeof window === "undefined") {
      return 0;
    }

    const rawStartIndex = window.sessionStorage.getItem("phonix-sentence-start-index");
    const parsed = Number.parseInt(rawStartIndex || "0", 10);
    return Number.isFinite(parsed)
      ? Math.max(0, Math.min(parsed, Math.max(0, sentenceData.length - 1)))
      : 0;
  });
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState<boolean | null>(null);
  const [showLevelCompleteModal, setShowLevelCompleteModal] = useState(false);
  const currentSentence = sentenceData[currentIndex];

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("phonix-sentence-start-index");
    }
  }, []);

  const question = useMemo(() => {
    const stopWords = new Set(["ang", "sang", "ako", "si", "sa", "ni", "kay", "nga"]);
    const words = currentSentence.nativeSentence.split(/\s+/);
    const cleanWords = words.map((word) => word.replace(/[^A-Za-zÀ-ÿ'-]/g, "").toLowerCase());

    const candidateIndexes = cleanWords
      .map((word, index) => ({ word, index }))
      .filter(({ word }) => word.length > 2 && !stopWords.has(word))
      .map(({ index }) => index);

    const blankIndex =
      candidateIndexes.length > 0 ? candidateIndexes[0] : Math.max(0, words.length - 1);
    const correctWord = words[blankIndex].replace(/[^A-Za-zÀ-ÿ'-]/g, "");

    const distractors = vocabularyData
      .map((item) => item.nativeWord)
      .filter((word) => word.toLowerCase() !== correctWord.toLowerCase())
      .slice(currentIndex, currentIndex + 30)
      .filter(
        (word, index, array) =>
          array.findIndex((entry) => entry.toLowerCase() === word.toLowerCase()) === index,
      )
      .slice(0, 3);

    while (distractors.length < 3) {
      const fallback =
        vocabularyData[(distractors.length + currentIndex) % vocabularyData.length]?.nativeWord ||
        "Pulong";
      if (fallback.toLowerCase() !== correctWord.toLowerCase()) {
        distractors.push(fallback);
      }
    }

    const options = [correctWord, ...distractors].sort((a, b) => {
      const seed = (currentSentence.id + a + b)
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return seed % 3 === 0 ? -1 : 1;
    });

    const maskedWords = [...words];
    maskedWords[blankIndex] = "_____";

    return {
      maskedSentence: maskedWords.join(" "),
      correctWord,
      options,
    };
  }, [currentSentence, currentIndex]);

  const goToNextQuestion = () => {
    if (currentIndex < sentenceData.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowResult(false);
      setIsCorrectAnswer(null);
    } else {
      // Award completion rewards at the end of sentence practice.
      updateState((prev) => ({ stars: prev.stars + 1, totalXP: prev.totalXP + 8 }));
      setShowLevelCompleteModal(true);
    }
  };

  const handleNext = () => {
    if (!showResult) {
      return;
    }

    goToNextQuestion();
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedOption(null);
      setShowResult(false);
      setIsCorrectAnswer(null);
    }
  };

  const handleOptionSelect = (option: string) => {
    if (showResult) {
      return;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(option);
      utterance.lang = "fil-PH";
      utterance.rate = 0.85;
      utterance.pitch = 0.75;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }

    setSelectedOption(option);
  };

  const handleCheckAnswer = () => {
    if (showResult || !selectedOption) {
      return;
    }

    const isCorrect = selectedOption.toLowerCase() === question.correctWord.toLowerCase();
    setShowResult(true);
    setIsCorrectAnswer(isCorrect);

    updateState((prev) => ({
      totalXP: prev.totalXP + (isCorrect ? 6 : 2),
      stars: prev.stars + (isCorrect ? 1 : 0),
      sentenceAnswersInCycle: Math.min(prev.sentenceAnswersInCycle + 1, sentenceData.length),
    }));
  };

  const handleSkip = () => {
    if (showResult) {
      return;
    }

    goToNextQuestion();
  };

  const playAudio = (text: string, e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    if ("speechSynthesis" in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Configure for Hiligaynon/Filipino pronunciation
      utterance.lang = "fil-PH"; // Filipino language code
      utterance.rate = 0.8;
      utterance.pitch = 0.75;
      utterance.volume = 1.0;

      const speakWithBestVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const robotVoice = voices.find((voice) => {
          const name = voice.name.toLowerCase();
          return (
            name.includes("robot") ||
            name.includes("siri") ||
            name.includes("fred") ||
            name.includes("david") ||
            name.includes("zira") ||
            name.includes("microsoft") ||
            name.includes("google us english")
          );
        });

        const filipinoVoice = voices.find((voice) => {
          const lang = voice.lang.toLowerCase();
          return lang.includes("fil") || lang.includes("tl") || lang.includes("ph");
        });

        const englishFallback = voices.find((voice) => voice.lang.toLowerCase().startsWith("en"));
        utterance.voice = robotVoice || filipinoVoice || englishFallback || voices[0] || null;
        window.speechSynthesis.speak(utterance);
      };

      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          speakWithBestVoice();
        };
      } else {
        speakWithBestVoice();
      }
    }
  };

  const playMaskedSentenceAudio = (e?: React.MouseEvent<HTMLButtonElement>) => {
    const spokenSentence = question.maskedSentence.replace(/_{3,}/g, "blangko");
    playAudio(spokenSentence, e);
  };

  const responseLanguage = appState.nativeLanguage || "English";
  const sentenceMascotMessage =
    responseLanguage.trim().toLowerCase() === "filipino"
      ? "Pwede akong magbigay ng clue sa pangungusap na ito."
      : "I can give clues for this sentence.";

  const sentencePageContext = [
    "Current page: sentence practice.",
    `Target language: ${appState.targetLanguage || "Hiligaynon"}.`,
    `Response language: ${responseLanguage}.`,
    `Current masked sentence: ${question.maskedSentence}.`,
    `Correct hidden word: ${question.correctWord}.`,
    `English hint sentence: ${currentSentence.englishSentence}.`,
    `Current sentence options: ${question.options.join(", ")}.`,
    showResult
      ? `The learner has already answered. Selected option: ${selectedOption || "none"}.`
      : "The learner has not answered yet.",
    "This page is a quiz/fill-in-the-blank practice. Never reveal the exact hidden answer directly unless the learner has already answered and asks for an explanation.",
    "If the learner asks for help before answering, provide only clues, grammar hints, elimination help, or meaning hints.",
    "If the learner asks how the page works, explain that they choose the missing word, then check the answer.",
  ].join("\n");

  return (
    // Sentence Learning Page Container
    <div className="flex min-h-[100dvh] flex-col overflow-hidden md:min-h-screen">
      {/* Top Navigation with Progress */}
      <NavigationHeader
        onMenu={openMobileNav}
        onBack={() => navigate("vocabulary")}
        onLogout={() => navigate("landing")}
        title="Sentence Practice"
        showProgress={true}
        currentProgress={currentIndex + 1}
        totalProgress={sentenceData.length}
      />

      {/* Main Sentence Practice Content */}
      <div className="flex-1 overflow-hidden px-3 pb-[5.5rem] pt-2 sm:px-4 sm:pb-28 sm:pt-5">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col justify-between">
          {/* Active Sentence Card */}
          <motion.div
            key={currentSentence.id}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 140 }}
            className="flex min-h-0 flex-1"
          >
            <Card className="flex h-full min-h-[39rem] flex-1 flex-col justify-between rounded-[32px] p-4 text-center shadow-[0_18px_40px_rgba(15,27,36,0.08)] sm:min-h-0 sm:p-6">
              {/* Illustration */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  rotate: [0, 2, -2, 0],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="mb-5 flex items-center justify-center text-7xl leading-none sm:mb-8 sm:text-9xl"
              >
                {currentSentence.illustration}
              </motion.div>

              {/* Native Sentence */}
              <div className="theme-bg-surface mb-4 rounded-[28px] border p-4 sm:mb-8 sm:p-6">
                <p className="theme-text-soft mb-2 text-xs font-bold sm:mb-3 sm:text-sm">
                  {appState.targetLanguage} Fill in the blank:
                </p>
                <div className="flex items-center justify-center gap-3 sm:gap-4">
                  <h2 className="font-baloo text-[2rem] font-bold leading-tight sm:text-3xl md:text-4xl">
                    {question.maskedSentence}
                  </h2>
                  <button
                    onClick={(e) => playMaskedSentenceAudio(e)}
                    className="bg-primary flex-shrink-0 rounded-full p-3 transition-transform hover:scale-110 sm:p-4"
                  >
                    🔊
                  </button>
                </div>
              </div>

              {/* English Translation */}
              <div className="theme-bg-surface rounded-[28px] border p-4 sm:p-6">
                <p className="theme-text-soft mb-2 text-xs font-bold sm:mb-3 sm:text-sm">
                  {appState.nativeLanguage} Hint:
                </p>
                <div className="flex items-center justify-center gap-3 sm:gap-4">
                  <h3 className="font-baloo text-[2rem] font-bold leading-tight text-secondary sm:text-3xl md:text-4xl">
                    {currentSentence.englishSentence}
                  </h3>
                  <button
                    onClick={(e) => playAudio(currentSentence.englishSentence, e)}
                    className="bg-secondary flex-shrink-0 rounded-full p-3 text-white transition-transform hover:scale-110 sm:p-4"
                  >
                    🔊
                  </button>
                </div>
              </div>

              {/* Answer Option Buttons */}
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:mt-6 sm:gap-3">
                {question.options.map((option) => {
                  const isCorrectOption =
                    option.toLowerCase() === question.correctWord.toLowerCase();
                  const isSelected = selectedOption?.toLowerCase() === option.toLowerCase();

                  const stateClass = !showResult
                    ? isSelected
                      ? "border border-[#56b8e8] bg-[#173b52] text-[#d4efff]"
                      : "theme-bg-surface hover:border-[#56b8e8]"
                    : isCorrectOption
                      ? "border border-green-500 bg-green-100 text-green-900"
                      : isSelected
                        ? "border border-red-500 bg-red-100 text-red-900"
                        : "theme-bg-surface opacity-70";

                  return (
                    <button
                      key={option}
                      onClick={() => handleOptionSelect(option)}
                      disabled={showResult}
                      className={`rounded-2xl border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed sm:px-4 sm:py-2.5 sm:text-base ${stateClass}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {/* Answer Feedback */}
              {showResult && (
                <div className="theme-bg-surface mt-3 rounded-xl border p-3 sm:mt-4 sm:p-4">
                  <p className="text-base font-bold sm:text-lg">
                    {isCorrectAnswer ? "Correct! Great job!" : "Nice try!"}
                  </p>
                  <p className="theme-text-soft mt-1 text-sm font-semibold sm:text-base">
                    Correct answer: {question.correctWord}
                  </p>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Progress Dots */}
          <div className="mt-1 flex justify-center gap-1.5 sm:mt-4 sm:gap-2">
            {sentenceData.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-all sm:h-3 sm:w-3 ${
                  index === currentIndex
                    ? "w-5 bg-secondary sm:w-6"
                    : index < currentIndex
                      ? "bg-success"
                      : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--border)] bg-[color:var(--bg)]/95 px-3 py-3 backdrop-blur sm:px-4">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-center gap-4 sm:justify-between">
          <button
            onClick={showResult ? handlePrevious : handleSkip}
            className="theme-bg-surface w-[7rem] rounded-2xl border px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.08em] sm:w-auto sm:px-6"
          >
            {showResult ? "Previous" : "Skip"}
          </button>
          <button
            onClick={showResult ? handleNext : handleCheckAnswer}
            disabled={!showResult && !selectedOption}
            className={`w-[7rem] rounded-2xl px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.08em] transition sm:w-auto sm:min-w-[136px] sm:px-8 ${
              !showResult && !selectedOption
                ? "theme-bg-surface cursor-not-allowed border"
                : "bg-gradient-to-r from-primary to-secondary text-white shadow-lg"
            }`}
          >
            {showResult
              ? currentIndex === sentenceData.length - 1
                ? "Finish"
                : "Continue"
              : "Check"}
          </button>
        </div>
      </div>

      {/* Level Complete Modal */}
      {showLevelCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-3xl border-4 border-primary bg-white p-8 text-center shadow-2xl">
            <div className="mb-4 flex items-center justify-center text-7xl leading-none">🎉</div>
            <h3 className="font-baloo text-3xl font-bold text-gray-800">
              Sentence Level Complete!
            </h3>
            <p className="mt-3 text-gray-600 font-semibold">
              Great job finishing sentence practice. Want to review the words you learned? Check
              your Backpack.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => {
                  setShowLevelCompleteModal(false);
                  navigate("collection");
                }}
                className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-secondary px-6 py-4 font-bold text-white shadow-lg"
              >
                See Backpack
              </button>
              <button
                onClick={() => {
                  setShowLevelCompleteModal(false);
                  navigate("dashboard");
                }}
                className="flex-1 rounded-2xl bg-gray-100 px-6 py-4 font-bold"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Mascot Assistant */}
      <Mascot
        message={sentenceMascotMessage}
        animation="float"
        responseLanguage={responseLanguage}
        pageContext={sentencePageContext}
        containerClassName="bottom-12 right-3 md:bottom-6 md:right-6"
      />
    </div>
  );
}
