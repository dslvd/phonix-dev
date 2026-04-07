import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import Card from './Card';
import { AIRequestError, askCloudAI, generateFallbackAIAnswer } from '../lib/aiFallback';

interface AISearchBarProps {
  onSearch?: (query: string, result: string) => void;
  responseLanguage?: string;
  targetLanguage?: string;
  pageContext?: string;
}

export default function AISearchBar({
  onSearch,
  responseLanguage = 'English',
  targetLanguage = 'Hiligaynon',
  pageContext = '',
}: AISearchBarProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);
  const isFilipino = responseLanguage.trim().toLowerCase() === 'filipino';

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResult('');
    setUsingFallback(false);

    try {
      const aiResult =
        (await askCloudAI(query, targetLanguage, [], pageContext, responseLanguage)) ||
        (isFilipino
          ? 'Handa akong tumulong sa iyong pag-aaral.'
          : 'I am ready to help you practice more words!');

      setResult(aiResult);
      if (onSearch) {
        onSearch(query, aiResult);
      }
    } catch (err) {
      const fallbackResult = generateFallbackAIAnswer(query, targetLanguage, responseLanguage);
      setUsingFallback(true);
      setResult(fallbackResult);

      if (err instanceof AIRequestError && err.code === 'rate_limited') {
        setError(
          isFilipino
            ? 'Naabot ng Gemini ang rate o quota limit. Lokal muna ang sagot ng Smart Helper Mode.'
            : 'Gemini hit a rate limit or quota limit. Smart Helper Mode is answering locally for now.'
        );
      } else if (err instanceof AIRequestError && err.code === 'missing_api_key') {
        setError(
          isFilipino
            ? 'Wala ang Gemini API key. Lokal muna ang sagot ng Smart Helper Mode.'
            : 'Gemini API key is missing. Smart Helper Mode is answering locally.'
        );
      } else {
        setError(
          isFilipino
            ? 'Hindi available ang Cloud AI ngayon. Lokal muna ang sagot ng Smart Helper Mode.'
            : 'Cloud AI is unavailable right now. Smart Helper Mode is answering locally.'
        );
      }

      console.error('AI Search Error:', err);

      if (onSearch) {
        onSearch(query, fallbackResult);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch();
    }
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-3xl">🤖</span>
          <div>
            <h3 className="text-xl font-bold">
              AI Learning Assistant
            </h3>
            <p className="text-muted text-sm">
              {isFilipino
                ? `Magtanong tungkol sa ${targetLanguage} at sa app.`
                : `Ask me anything about ${targetLanguage} and the app!`}
            </p>
          </div>
        </div>

        {usingFallback && (
          <div
            className="rounded-2xl border px-4 py-3"
            style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, var(--surface))' }}
          >
            <p className="text-sm font-bold">
              {isFilipino
                ? 'Smart Helper Mode ay aktibo kaya may sagot agad ang website AI.'
                : 'Smart Helper Mode is active so the website AI still works right away.'}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              isFilipino
                ? `Paano sabihin ang "hello" sa ${targetLanguage}?`
                : `e.g., How do I say 'hello' in ${targetLanguage}?`
            }
            className="flex-1 rounded-2xl border bg-transparent px-4 py-3 text-base font-semibold outline-none transition focus:border-[color:var(--primary)]"
            disabled={loading}
          />
          <Button
            variant="secondary"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            icon={loading ? '⏳' : '🔍'}
          >
            {loading ? (isFilipino ? 'Nag-iisip...' : 'Thinking...') : isFilipino ? 'Magtanong' : 'Ask'}
          </Button>
        </div>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-4 text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="text-4xl inline-block"
            >
              🤖
            </motion.div>
            <p className="text-muted mt-2 text-sm">
              {isFilipino ? 'Nag-iisip ang AI...' : 'AI is thinking...'}
            </p>
          </motion.div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-red-400/60 bg-red-500/10 p-4"
            >
              <p className="text-sm font-semibold text-red-300">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="card rounded-2xl p-4"
            >
              <div className="mb-2 flex items-start gap-2">
                <span className="text-2xl">💡</span>
                <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                  {isFilipino ? 'Sagot ng AI:' : 'AI Answer:'}
                </p>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">
                {result}
              </div>
              <button
                onClick={() => {
                  setResult('');
                  setQuery('');
                }}
                className="mt-3 text-xs font-bold"
                style={{ color: 'var(--primary)' }}
              >
                {isFilipino ? 'Magtanong ulit' : 'Ask another question'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {!result && !loading && (
          <div className="pt-2">
            <p className="text-muted mb-2 text-xs font-semibold">
              {isFilipino ? 'Subukan mong itanong:' : 'Try asking:'}
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                isFilipino
                  ? [
                      'Paano magbilang hanggang 10?',
                      'Turuan mo ako ng mga bati',
                      'Ano ang gamit ng XP?',
                      'Paano magka-battery ulit?',
                    ]
                  : [
                      'How do I count to 10?',
                      'Teach me greetings',
                      'What does XP do?',
                      'How do I get batteries again?',
                    ]
              ).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                  className="rounded-full border px-3 py-1 text-xs font-semibold transition hover:border-[color:var(--primary)]"
                  style={{ backgroundColor: 'var(--surface)' }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
