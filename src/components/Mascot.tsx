import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AIChatTurn, AIRequestError, askCloudAI, generateFallbackAIAnswer } from '../lib/aiFallback';

interface MascotProps {
  message?: string;
  position?: 'bottom' | 'center';
  animation?: 'bounce' | 'float' | 'wiggle';
  pageContext?: string;
  responseLanguage?: string;
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
}

const cleanAssistantText = (value: string) =>
  value
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

export default function Mascot({
  message = "Beep! Boop! Beep! Hello friends! Let's learn!",
  position = 'bottom',
  animation = 'float',
  pageContext = '',
  responseLanguage = 'English',
}: MascotProps) {
  const isFilipino = responseLanguage.trim().toLowerCase() === 'filipino';
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: cleanAssistantText(message),
    },
  ]);

  const positionClasses = {
    bottom: 'fixed bottom-4 right-4 md:bottom-6 md:right-6',
    center: 'mx-auto',
  };

  const animationClasses = {
    bounce: 'animate-bounce-slow',
    float: 'animate-float',
    wiggle: 'animate-wiggle',
  };
  const uiText = {
    title: isFilipino ? 'AI Assistant' : 'AI Assistant',
    subtitle: isFilipino ? 'Magtanong ng tungkol sa lesson' : 'Ask a quick question about the lesson',
    placeholder: isFilipino ? 'Magtanong tungkol sa salita o aralin' : 'Ask about a word or lesson...',
    send: isFilipino ? 'Ipadala' : 'Send',
    thinking: isFilipino ? 'Nag-iisip...' : 'Thinking...',
  };

  const panelClasses = useMemo(
    () =>
      position === 'bottom'
        ? 'fixed bottom-24 right-4 z-50 w-[min(22rem,calc(100vw-1.5rem))] md:bottom-28 md:right-6'
        : 'mx-auto mt-4 w-full max-w-sm',
    [position]
  );

  const handleAsk = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || loading) return;

    const history: AIChatTurn[] = messages.map((entry) => ({
      role: entry.role,
      text: entry.text,
    }));

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmedQuery,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setLoading(true);
    setError('');

    try {
      const answer =
        (await askCloudAI(trimmedQuery, 'Hiligaynon', history, pageContext, responseLanguage)) ||
        'I can help with Hiligaynon questions.';

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: cleanAssistantText(answer),
        },
      ]);
    } catch (err) {
      const fallbackAnswer = generateFallbackAIAnswer(trimmedQuery, 'Hiligaynon', responseLanguage);

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: cleanAssistantText(fallbackAnswer),
        },
      ]);

      if (err instanceof AIRequestError && err.code === 'rate_limited') {
        setError('Gemini is busy right now. Smart Helper Mode answered locally.');
      } else if (err instanceof AIRequestError && err.code === 'missing_api_key') {
        setError('Gemini key is missing. Smart Helper Mode answered locally.');
      } else {
        setError('Cloud AI is unavailable right now. Smart Helper Mode answered locally.');
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
            <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between bg-gradient-to-r from-cyan-400 via-sky-400 to-yellow-200 px-4 py-3">
                <div>
                  <p className="font-baloo text-lg font-bold text-slate-900">AI Assistant</p>
                  <p className="text-xs font-semibold text-slate-700">{uiText.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-lg font-bold text-slate-700 transition hover:bg-white"
                  aria-label="Close AI assistant"
                >
                  x
                </button>
              </div>

              <div className="max-h-80 space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((chatMessage) => (
                  <div
                    key={chatMessage.id}
                    className={`flex ${chatMessage.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-semibold leading-relaxed shadow-sm ${
                        chatMessage.role === 'user'
                          ? 'bg-gradient-to-r from-sky-500 to-[#FF9126] text-white'
                          : 'bg-slate-50 text-slate-700'
                      }`}
                    >
                      {chatMessage.text}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
                      {uiText.thinking}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                  {error}
                </div>
              )}

              <div className="border-t border-slate-100 px-4 py-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAsk();
                      }
                    }}
                    rows={1}
                    placeholder={uiText.placeholder}
                    className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={handleAsk}
                    disabled={loading || !query.trim()}
                    className="rounded-2xl bg-gradient-to-r from-sky-500 to-[#FF9126] px-4 py-3 text-sm font-bold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uiText.send}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`${positionClasses[position]} z-50 select-none`}>
        <AnimatePresence>
          {!isOpen && message && position === 'bottom' && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.2 }}
              onClick={() => setIsOpen(true)}
              className="absolute bottom-full right-0 mb-3 w-[11rem] rounded-2xl bg-white px-4 py-3 text-left text-sm font-bold leading-snug text-slate-700 shadow-lg md:w-[13rem]"
            >
              <span className="block whitespace-normal break-words">{cleanAssistantText(message)}</span>
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative flex items-center justify-center rounded-full border border-white/60 bg-white/90 p-2 shadow-2xl backdrop-blur-md"
          aria-label={isOpen ? 'Hide AI assistant' : 'Open AI assistant'}
        >
          <span className={`${animationClasses[animation]} text-5xl leading-none md:text-6xl`}>🤖</span>
        </motion.button>
      </div>
    </>
  );
}
