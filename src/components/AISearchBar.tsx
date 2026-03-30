import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import Card from './Card';
import { AIRequestError, askCloudAI, generateFallbackAIAnswer } from '../lib/aiFallback';

interface AISearchBarProps {
  onSearch?: (query: string, result: string) => void;
}

export default function AISearchBar({ onSearch }: AISearchBarProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResult('');
    setUsingFallback(false);

    try {
      const aiResult =
        (await askCloudAI(query, 'Hiligaynon')) || 'I am ready to help you practice more words!';

      setResult(aiResult);
      if (onSearch) {
        onSearch(query, aiResult);
      }
    } catch (err) {
      const fallbackResult = generateFallbackAIAnswer(query, 'Hiligaynon');
      setUsingFallback(true);
      setResult(fallbackResult);

      if (err instanceof AIRequestError && err.code === 'rate_limited') {
        setError('Gemini hit a rate limit or quota limit. Smart Helper Mode is answering locally for now.');
      } else if (err instanceof AIRequestError && err.code === 'missing_api_key') {
        setError('Gemini API key is missing. Smart Helper Mode is answering locally.');
      } else {
        setError('Cloud AI is unavailable right now. Smart Helper Mode is answering locally.');
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
    <Card className="bg-gradient-to-br from-purple-100 to-pink-100">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-3xl">🤖</span>
          <div>
            <h3 className="font-baloo text-xl font-bold text-gray-800">
              AI Learning Assistant
            </h3>
            <p className="text-sm text-gray-600">Ask me anything about Filipino language!</p>
          </div>
        </div>

        {usingFallback && (
          <div className="rounded-2xl border-2 border-yellow-300 bg-yellow-50 px-4 py-3">
            <p className="text-sm font-bold text-yellow-700">
              ✨ Smart Helper Mode is active so the website AI still works right away.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="e.g., How do I say 'hello' in Hiligaynon?"
            className="flex-1 px-4 py-3 rounded-2xl border-2 border-purple-300 focus:border-primary outline-none text-base font-semibold transition-all"
            disabled={loading}
          />
          <Button
            variant="secondary"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            icon={loading ? '⏳' : '🔍'}
          >
            {loading ? 'Thinking...' : 'Ask'}
          </Button>
        </div>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="text-4xl inline-block"
            >
              🤖
            </motion.div>
            <p className="text-sm text-gray-600 mt-2">AI is thinking...</p>
          </motion.div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-100 border-2 border-red-300 rounded-2xl p-4"
            >
              <p className="text-red-700 font-semibold text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl p-4 shadow-lg border-2 border-purple-200"
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="text-2xl">💡</span>
                <p className="font-bold text-sm text-purple-600">AI Answer:</p>
              </div>
              <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {result}
              </div>
              <button
                onClick={() => {
                  setResult('');
                  setQuery('');
                }}
                className="mt-3 text-xs text-purple-600 hover:text-purple-800 font-bold"
              >
                ✨ Ask another question
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {!result && !loading && (
          <div className="pt-2">
            <p className="text-xs text-gray-500 mb-2 font-semibold">💡 Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'How do I count to 10?',
                'Teach me greetings',
                'What are common phrases?',
                'Tell me about animals',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                  className="text-xs bg-white px-3 py-1 rounded-full border border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all font-semibold"
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
