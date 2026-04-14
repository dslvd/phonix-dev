import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "./Button";
import {
  AIChatTurn,
  AIRequestError,
  askCloudAI,
  generateFallbackAIAnswer,
} from "../lib/aiFallback";

interface MascotProps {
  message?: string;
  position?: "bottom" | "center";
  animation?: "bounce" | "float" | "wiggle";
  pageContext?: string;
  responseLanguage?: string;
  containerClassName?: string;
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

const cleanAssistantText = (value: string) =>
  value
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();

export default function Mascot({
  message = "Beep! Boop! Beep! Hello friends! Let's learn!",
  position = "bottom",
  animation = "float",
  pageContext = "",
  responseLanguage = "English",
  containerClassName = "",
}: MascotProps) {
  const AUTO_HIDE_MESSAGE_MS = 3000;
  const isFilipino = responseLanguage.trim().toLowerCase() === "filipino";
  const isGuestMode = (() => {
    if (typeof window === "undefined") {
      return false;
    }

    const rawUser = window.localStorage.getItem("user");
    if (!rawUser) {
      return false;
    }

    try {
      const user = JSON.parse(rawUser) as { name?: string; email?: string };
      const name = (user.name || "").trim().toLowerCase();
      const email = (user.email || "").trim();
      return name === "guest" || email.length === 0;
    } catch {
      return false;
    }
  })();
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(Boolean(message));
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: cleanAssistantText(message),
    },
  ]);

  const positionClasses = {
    bottom: "fixed bottom-4 right-4 md:bottom-6 md:right-6",
    center: "mx-auto",
  };

  const animationClasses = {
    bounce: "animate-bounce-slow",
    float: "animate-float",
    wiggle: "animate-wiggle",
  };
  const uiText = {
    title: "Pippin",
    subtitle: isFilipino
      ? "Magtanong ng tungkol sa lesson"
      : "Ask a quick question about the lesson",
    placeholder: isFilipino
      ? "Magtanong tungkol sa salita o aralin"
      : "Ask about a word or lesson...",
    send: isFilipino ? "Ipadala" : "Send",
    thinking: isFilipino ? "Nag-iisip..." : "Thinking...",
  };

  const panelClasses = useMemo(
    () =>
      position === "bottom"
        ? "fixed bottom-20 right-3 z-[65] w-[min(24rem,calc(100vw-1.25rem))] sm:bottom-24 sm:right-4 md:bottom-28 md:right-6"
        : "mx-auto mt-4 w-full max-w-sm",
    [position],
  );

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0) {
        return [{ id: "welcome", role: "assistant", text: cleanAssistantText(message) }];
      }

      const [first, ...rest] = prev;
      if (first.role !== "assistant") {
        return prev;
      }

      return [{ ...first, text: cleanAssistantText(message) }, ...rest];
    });
  }, [message]);

  useEffect(() => {
    if (!message || isOpen || position !== "bottom") {
      setShowBubble(false);
      return;
    }

    setShowBubble(true);
    const timeoutId = window.setTimeout(() => {
      setShowBubble(false);
    }, AUTO_HIDE_MESSAGE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [message, isOpen, position]);

  const handleAsk = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || loading) return;

    if (isGuestMode) {
      setError("Log in to continue using Pippin features.");
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-login-${Date.now()}`,
          role: "assistant",
          text: cleanAssistantText(
            "Please log in to use AI responses. You can still continue lessons as guest.",
          ),
        },
      ]);
      setQuery("");
      return;
    }

    const history: AIChatTurn[] = messages.map((entry) => ({
      role: entry.role,
      text: entry.text,
    }));

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmedQuery,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setLoading(true);
    setError("");

    try {
      const answer =
        (await askCloudAI(trimmedQuery, "Hiligaynon", history, pageContext, responseLanguage)) ||
        "I can help with Hiligaynon questions.";

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: cleanAssistantText(answer),
        },
      ]);
    } catch (err) {
      const fallbackAnswer = generateFallbackAIAnswer(
        trimmedQuery,
        "Hiligaynon",
        responseLanguage,
        pageContext,
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: cleanAssistantText(fallbackAnswer),
        },
      ]);

      if (err instanceof AIRequestError && err.code === "missing_api_key") {
        setError("Gemini key is missing. Smart Helper Mode answered locally.");
      } else {
        setError("");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className={panelClasses}
          >
            <div className="overflow-hidden rounded-3xl border shadow-2xl">
              <div className="theme-bg-surface flex items-center justify-between border-b px-4 py-3">
                <div>
                  <p className="font-baloo text-lg font-bold">{uiText.title}</p>
                  <p className="theme-text-soft text-xs font-semibold">{uiText.subtitle}</p>
                </div>
                <Button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  unstyled
                  className="theme-bg-surface flex h-9 w-9 items-center justify-center rounded-full border text-lg font-bold transition"
                  aria-label="Close Pippin"
                >
                  x
                </Button>
              </div>

              <div className="theme-bg-surface max-h-80 space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((chatMessage) => (
                  <div
                    key={chatMessage.id}
                    className={`flex ${chatMessage.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-semibold leading-relaxed shadow-sm ${
                        chatMessage.role === "user"
                          ? "bg-gradient-to-r from-[#FF9126] to-[#ffb35a] text-[#4a2a00]"
                          : "border"
                      }`}
                    >
                      {chatMessage.text}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="theme-text-soft rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm">
                      {uiText.thinking}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="border-t border-[#ffb35a] bg-[#5b3a13] px-4 py-2 text-xs font-semibold text-[#ffd9a8]">
                  {error}
                </div>
              )}

              <div className="theme-bg-surface border-t px-4 py-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAsk();
                      }
                    }}
                    rows={1}
                    placeholder={uiText.placeholder}
                    disabled={isGuestMode}
                    className="theme-bg-surface max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#FF9126]"
                  />
                  <Button
                    type="button"
                    onClick={handleAsk}
                    disabled={isGuestMode || loading || !query.trim()}
                    unstyled
                    className="rounded-2xl border-b-4 border-[#FF9126] bg-[#FF9126] px-4 py-3 text-sm font-bold text-[#4a2a00] shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uiText.send}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`${positionClasses[position]} ${containerClassName} z-[65] select-none`}>
        <AnimatePresence>
          {!isOpen && showBubble && message && position === "bottom" && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ delay: 0.2 }}
              className="theme-bg-surface absolute bottom-full right-0 mb-3 w-[12.25rem] rounded-[20px] border px-3.5 pb-2.5 pt-2.5 text-left text-xs font-bold leading-relaxed shadow-[0_18px_35px_rgba(15,27,36,0.24)] md:w-[13.5rem]"
            >
              <Button
                type="button"
                onClick={() => setShowBubble(false)}
                unstyled
                className="theme-bg-surface absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold leading-none text-[color:var(--text)]/70 shadow-sm transition hover:border-[color:var(--primary)] hover:text-[color:var(--text)]"
                aria-label="Dismiss mascot message"
              >
                x
              </Button>
              <span className="block pr-6 md:pr-1 whitespace-normal break-words">
                {cleanAssistantText(message)}
              </span>
              <span
                aria-hidden="true"
                className="theme-bg-surface absolute -bottom-1.5 right-5 h-4 w-4 rotate-45 border-b border-r"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          onClick={() => setIsOpen((prev) => !prev)}
          className="theme-bg-surface relative flex h-14 w-14 items-center justify-center rounded-full border shadow-[0_24px_40px_rgba(15,27,36,0.24)] md:h-16 md:w-16"
          aria-label={isOpen ? "Hide Pippin" : "Open Pippin"}
        >
          <img
            src="/assets/PipinIcon.png"
            alt="Pipin mascot"
            className={`${animationClasses[animation]} h-18 w-18 object-contain md:h-22 md:w-22`}
          />
        </motion.button>
      </div>
    </>
  );
}
