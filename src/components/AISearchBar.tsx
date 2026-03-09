import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import Card from './Card';

interface AISearchBarProps {
  onSearch?: (query: string, result: string) => void;
}

export default function AISearchBar({ onSearch }: AISearchBarProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResult('');

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        setError('⚠️ API key not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a helpful Filipino language learning assistant for kids. Answer this question in a simple, fun way with emojis: ${query}`
              }]
            }]
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const aiResult = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';
      
      setResult(aiResult);
      if (onSearch) {
        onSearch(query, aiResult);
      }
    } catch (err) {
      setError('❌ Sorry, something went wrong. Please try again!');
      console.error('AI Search Error:', err);
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
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-3xl">🤖</span>
          <div>
            <h3 className="font-baloo text-xl font-bold text-gray-800">
              AI Learning Assistant
            </h3>
            <p className="text-sm text-gray-600">Ask me anything about Filipino language!</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
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

        {/* Loading Animation */}
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

        {/* Error Message */}
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

        {/* Result */}
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

        {/* Suggested Questions */}
        {!result && !loading && (
          <div className="pt-2">
            <p className="text-xs text-gray-500 mb-2 font-semibold">💡 Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'How do I count to 10?',
                'Teach me greetings',
                'What are common phrases?',
                'Tell me about animals'
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
