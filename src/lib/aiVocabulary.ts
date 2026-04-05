import { VocabularyItem } from '../data/vocabulary';

type Difficulty = VocabularyItem['difficulty'];

interface AIVocabularyPayload {
  words?: Array<{
    id?: string;
    nativeWord?: string;
    englishWord?: string;
    category?: string;
    emoji?: string;
    difficulty?: Difficulty | string;
  }>;
}

const LEVEL_COUNTS: Record<Difficulty, number> = {
  beginner: 20,
  intermediate: 20,
  advanced: 7,
};

const clampDifficulty = (value: string | undefined): Difficulty => {
  if (value === 'beginner' || value === 'intermediate' || value === 'advanced') {
    return value;
  }
  return 'beginner';
};

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const stripCodeFence = (text: string) => text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

const parsePayload = (rawText: string): AIVocabularyPayload | null => {
  const cleaned = stripCodeFence(rawText);

  try {
    return JSON.parse(cleaned) as AIVocabularyPayload;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as AIVocabularyPayload;
    } catch {
      return null;
    }
  }
};

const normalizeWord = (
  item: NonNullable<AIVocabularyPayload['words']>[number],
  index: number,
  fallbackDifficulty: Difficulty
): VocabularyItem | null => {
  if (!item) {
    return null;
  }

  const nativeWord = (item.nativeWord || '').trim();
  const englishWord = (item.englishWord || '').trim();

  if (!nativeWord || !englishWord) {
    return null;
  }

  const difficulty = clampDifficulty(item.difficulty) || fallbackDifficulty;
  const baseId = (item.id || `${difficulty}-${englishWord}`).trim();
  const id = toSlug(baseId) || `${difficulty}-word-${index + 1}`;

  return {
    id,
    nativeWord,
    englishWord,
    category: (item.category || 'general').trim() || 'general',
    emoji: (item.emoji || '🧠').trim() || '🧠',
    difficulty,
  };
};

const enforceLevelCounts = (words: VocabularyItem[]) => {
  const byDifficulty: Record<Difficulty, VocabularyItem[]> = {
    beginner: [],
    intermediate: [],
    advanced: [],
  };

  for (const word of words) {
    byDifficulty[word.difficulty].push(word);
  }

  const finalWords: VocabularyItem[] = [];

  (['beginner', 'intermediate', 'advanced'] as Difficulty[]).forEach((difficulty) => {
    const expected = LEVEL_COUNTS[difficulty];
    const current = byDifficulty[difficulty].slice(0, expected);

    while (current.length < expected) {
      const idx = current.length + 1;
      current.push({
        id: `${difficulty}-placeholder-${idx}`,
        nativeWord: `${difficulty} ${idx}`,
        englishWord: `${difficulty} word ${idx}`,
        category: 'general',
        emoji: '🧠',
        difficulty,
      });
    }

    finalWords.push(...current);
  });

  const seen = new Set<string>();
  return finalWords.map((word, idx) => {
    let id = word.id;
    if (seen.has(id)) {
      id = `${id}-${idx + 1}`;
    }
    seen.add(id);
    return { ...word, id };
  });
};

export const getAIVocabularyCacheKey = (targetLanguage: string, nativeLanguage: string) =>
  `phonix-ai-vocabulary:${(targetLanguage || 'hiligaynon').toLowerCase()}:${(nativeLanguage || 'english').toLowerCase()}`;

export const readCachedAIVocabulary = (targetLanguage: string, nativeLanguage: string): VocabularyItem[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(getAIVocabularyCacheKey(targetLanguage, nativeLanguage));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as VocabularyItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
};

export const writeCachedAIVocabulary = (targetLanguage: string, nativeLanguage: string, words: VocabularyItem[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getAIVocabularyCacheKey(targetLanguage, nativeLanguage), JSON.stringify(words));
};

export const fetchAIVocabulary = async (
  targetLanguage: string,
  nativeLanguage: string
): Promise<VocabularyItem[]> => {
  const prompt = [
    'Generate a complete vocabulary list for a language-learning app.',
    `Target language: ${targetLanguage || 'Hiligaynon'}.`,
    `Learner native language: ${nativeLanguage || 'English'}.`,
    'Return STRICT JSON only with this shape:',
    '{',
    '  "words": [',
    '    {',
    '      "id": "string",',
    '      "nativeWord": "string",',
    '      "englishWord": "string",',
    '      "category": "string",',
    '      "emoji": "string",',
    '      "difficulty": "beginner|intermediate|advanced"',
    '    }',
    '  ]',
    '}',
    'Rules:',
    '1. Provide exactly 47 words total.',
    '2. beginner must have exactly 20 words.',
    '3. intermediate must have exactly 20 words.',
    '4. advanced must have exactly 7 words.',
    '5. Avoid duplicates in nativeWord and englishWord.',
    '6. Keep words useful for daily conversation.',
  ].join('\n');

  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error('ai-vocabulary-request-failed');
  }

  const data = await response.json();
  const payload = parsePayload(String(data?.text || ''));
  const rawWords = payload?.words || [];

  const normalized = rawWords
    .map((word, index) => normalizeWord(word, index, 'beginner'))
    .filter((word): word is VocabularyItem => !!word);

  if (normalized.length < 20) {
    throw new Error('ai-vocabulary-invalid-payload');
  }

  return enforceLevelCounts(normalized);
};