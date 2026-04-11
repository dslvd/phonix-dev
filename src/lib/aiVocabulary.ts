import { VocabularyItem, buildPhaseOneSupportWords } from '../data/vocabulary';

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

interface AIVocabularyOptions {
  levelCycle?: number;
  allowRefresh?: boolean;
}

const LEVEL_COUNTS: Record<Difficulty, number> = {
  beginner: 20,
  intermediate: 20,
  advanced: 8,
};
const LATEST_AI_VOCABULARY_CACHE_KEY = 'phonix-ai-vocabulary:latest';
const PAIR_LATEST_CACHE_KEY_PREFIX = 'phonix-ai-vocabulary:pair-latest';
const memoryCache = new Map<string, VocabularyItem[]>();
const inFlightRequests = new Map<string, Promise<VocabularyItem[]>>();
const LEVEL_PACK_SIZE = LEVEL_COUNTS.beginner + LEVEL_COUNTS.intermediate + LEVEL_COUNTS.advanced;
export const VOCABULARY_PACK_WORD_COUNT = LEVEL_PACK_SIZE;
const LEVEL_THEMES = [
  'Animal Friends',
  'Color Quest',
  'Family and Home',
  'School Adventure',
  'Food Fun',
  'Playtime and Games',
  'Nature Explorers',
] as const;

const normalizeLevelCycle = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
};

const getLevelTheme = (levelCycle: number) => LEVEL_THEMES[levelCycle % LEVEL_THEMES.length];

export const getVocabularyLevelTheme = (levelCycle: number) => getLevelTheme(normalizeLevelCycle(levelCycle));

export const getVocabularyLevelCycle = (learnedCount: number) => {
  if (!Number.isFinite(learnedCount) || learnedCount <= 0) {
    return 0;
  }

  return Math.floor(learnedCount / LEVEL_PACK_SIZE);
};

const clampDifficulty = (value: string | undefined): Difficulty => {
  if (value === 'beginner' || value === 'intermediate' || value === 'advanced') {
    return value;
  }
  return 'beginner';
};

const getMeaningKey = (word: Pick<VocabularyItem, 'nativeWord' | 'englishWord'>) =>
  `${word.nativeWord}`.trim().toLowerCase() + '|' + `${word.englishWord}`.trim().toLowerCase();

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

const enforceLevelCounts = (words: VocabularyItem[], levelCycle: number) => {
  const byDifficulty: Record<Difficulty, VocabularyItem[]> = {
    beginner: [],
    intermediate: [],
    advanced: [],
  };

  for (const word of words) {
    byDifficulty[word.difficulty].push(word);
  }

  const finalWords: VocabularyItem[] = [];
  const supportWords = buildPhaseOneSupportWords(levelCycle);
  const supportWordKeys = new Set(supportWords.map(getMeaningKey));

  (['beginner', 'intermediate', 'advanced'] as Difficulty[]).forEach((difficulty) => {
    const expected = LEVEL_COUNTS[difficulty];
    const current =
      difficulty === 'beginner'
        ? [
            ...supportWords,
            ...byDifficulty.beginner.filter((word) => !supportWordKeys.has(getMeaningKey(word))),
          ].slice(0, expected)
        : byDifficulty[difficulty].slice(0, expected);

    while (current.length < expected) {
      const idx = current.length + 1;
      current.push({
        id: `lvl-${levelCycle + 1}-${difficulty}-placeholder-${idx}`,
        nativeWord: `${difficulty} ${levelCycle + 1}-${idx}`,
        englishWord: `${difficulty} level ${levelCycle + 1} word ${idx}`,
        category: 'general',
        emoji: '🧠',
        difficulty,
      });
    }

    finalWords.push(...current);
  });

  const seen = new Set<string>();
  return finalWords.map((word, idx) => {
    let id = `lvl-${levelCycle + 1}-${word.id}`;
    if (seen.has(id)) {
      id = `${id}-${idx + 1}`;
    }
    seen.add(id);
    return { ...word, id };
  });
};

const ensurePhaseOneSupportWords = (words: VocabularyItem[], levelCycle: number): VocabularyItem[] => {
  const supportWords = buildPhaseOneSupportWords(levelCycle);
  const supportWordKeys = new Set(supportWords.map(getMeaningKey));

  const beginnerWords = words.filter((word) => word.difficulty === 'beginner');
  const intermediateWords = words.filter((word) => word.difficulty === 'intermediate');
  const advancedWords = words.filter((word) => word.difficulty === 'advanced');

  return [
    ...[...supportWords, ...beginnerWords.filter((word) => !supportWordKeys.has(getMeaningKey(word)))].slice(
      0,
      LEVEL_COUNTS.beginner
    ),
    ...intermediateWords.slice(0, LEVEL_COUNTS.intermediate),
    ...advancedWords.slice(0, LEVEL_COUNTS.advanced),
  ];
};

export const getAIVocabularyCacheKey = (targetLanguage: string, nativeLanguage: string, levelCycle = 0) =>
  `phonix-ai-vocabulary:${(targetLanguage || 'hiligaynon').toLowerCase()}:${(nativeLanguage || 'english').toLowerCase()}:level-${normalizeLevelCycle(levelCycle)}`;

const getPairLatestCacheKey = (targetLanguage: string, nativeLanguage: string) =>
  `${PAIR_LATEST_CACHE_KEY_PREFIX}:${(targetLanguage || 'hiligaynon').toLowerCase()}:${(nativeLanguage || 'english').toLowerCase()}`;

const buildVocabularyPrompt = (
  targetLanguage: string,
  nativeLanguage: string,
  levelCycle: number,
  levelTheme: string
) =>
  [
    'Generate a complete vocabulary list for a language-learning app.',
    `Target language: ${targetLanguage || 'Hiligaynon'}.`,
    `Learner native language: ${nativeLanguage || 'English'}.`,
    `Current level cycle: ${levelCycle + 1}.`,
    `Level focus theme: ${levelTheme}.`,
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
    `1. Provide exactly ${VOCABULARY_PACK_WORD_COUNT} words total.`,
    '2. beginner must have exactly 20 words.',
    '3. intermediate must have exactly 20 words.',
    '4. advanced must have exactly 8 words.',
    '5. Avoid duplicates in nativeWord and englishWord.',
    '6. Keep words useful for daily conversation.',
    '7. Make vocabulary clearly match the level focus theme.',
    '8. Do not reuse the exact same set from previous levels.',
    '9. Keep words kid-friendly, simple, and easy to learn.',
    '10. Include these beginner support words in the pack: Cook, Work, and Hot.',
  ].join('\n');

export const readCachedAIVocabulary = (targetLanguage: string, nativeLanguage: string, options: AIVocabularyOptions = {}): VocabularyItem[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const cacheKey = getAIVocabularyCacheKey(targetLanguage, nativeLanguage, options.levelCycle);
  const memory = memoryCache.get(cacheKey);
  if (memory && memory.length > 0) {
    return memory;
  }

  const raw = window.localStorage.getItem(cacheKey);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as VocabularyItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    const enriched = ensurePhaseOneSupportWords(parsed, normalizeLevelCycle(options.levelCycle));
    memoryCache.set(cacheKey, enriched);
    return enriched;
  } catch {
    return [];
  }
};

export const readCachedAIVocabularyByPairLatest = (targetLanguage: string, nativeLanguage: string): VocabularyItem[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const pairLatestKey = getPairLatestCacheKey(targetLanguage, nativeLanguage);
  const memory = memoryCache.get(pairLatestKey);
  if (memory && memory.length > 0) {
    return memory;
  }

  const raw = window.localStorage.getItem(pairLatestKey);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as VocabularyItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    const enriched = ensurePhaseOneSupportWords(parsed, 0);
    memoryCache.set(pairLatestKey, enriched);
    return enriched;
  } catch {
    return [];
  }
};

export const readCachedAIVocabularyOrPairLatest = (
  targetLanguage: string,
  nativeLanguage: string,
  options: AIVocabularyOptions = {}
): VocabularyItem[] => {
  const exact = readCachedAIVocabulary(targetLanguage, nativeLanguage, options);
  if (exact.length > 0) {
    return exact;
  }

  return readCachedAIVocabularyByPairLatest(targetLanguage, nativeLanguage);
};

export const readLatestCachedAIVocabulary = (): VocabularyItem[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const memory = memoryCache.get(LATEST_AI_VOCABULARY_CACHE_KEY);
  if (memory && memory.length > 0) {
    return memory;
  }

  const raw = window.localStorage.getItem(LATEST_AI_VOCABULARY_CACHE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as VocabularyItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    const enriched = ensurePhaseOneSupportWords(parsed, 0);
    memoryCache.set(LATEST_AI_VOCABULARY_CACHE_KEY, enriched);
    return enriched;
  } catch {
    return [];
  }
};

export const readCachedAIVocabularyOrLatest = (targetLanguage: string, nativeLanguage: string): VocabularyItem[] => {
  const exact = readCachedAIVocabulary(targetLanguage, nativeLanguage);
  if (exact.length > 0) {
    return exact;
  }

  return readLatestCachedAIVocabulary();
};

export const writeCachedAIVocabulary = (
  targetLanguage: string,
  nativeLanguage: string,
  words: VocabularyItem[],
  options: AIVocabularyOptions = {}
) => {
  if (typeof window === 'undefined') {
    return;
  }

  const cacheKey = getAIVocabularyCacheKey(targetLanguage, nativeLanguage, options.levelCycle);
  const pairLatestKey = getPairLatestCacheKey(targetLanguage, nativeLanguage);
  memoryCache.set(cacheKey, words);
  memoryCache.set(pairLatestKey, words);
  memoryCache.set(LATEST_AI_VOCABULARY_CACHE_KEY, words);

  window.localStorage.setItem(cacheKey, JSON.stringify(words));
  window.localStorage.setItem(pairLatestKey, JSON.stringify(words));
  window.localStorage.setItem(LATEST_AI_VOCABULARY_CACHE_KEY, JSON.stringify(words));
};

export const getFiveStageLevel = (progress: number, total: number): number => {
  if (total <= 0) {
    return 1;
  }

  const stageSize = Math.max(1, Math.ceil(total / 5));
  const stage = Math.floor(progress / stageSize) + 1;
  return Math.max(1, Math.min(5, stage));
};

export const refreshAIVocabularyOverride = async (
  targetLanguage: string,
  nativeLanguage: string,
  options: AIVocabularyOptions = {}
): Promise<VocabularyItem[]> => {
  const levelCycle = normalizeLevelCycle(options.levelCycle);
  const levelTheme = getVocabularyLevelTheme(levelCycle);
  const prompt = buildVocabularyPrompt(targetLanguage, nativeLanguage, levelCycle, levelTheme);

  const response = await fetch('/api/ai-vocabulary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      targetLanguage,
      nativeLanguage,
      levelCycle,
      refresh: true,
    }),
  });

  if (!response.ok) {
    throw new Error('ai-vocabulary-override-refresh-failed');
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

  const finalized = enforceLevelCounts(normalized, levelCycle);
  writeCachedAIVocabulary(targetLanguage, nativeLanguage, finalized, { levelCycle });
  return finalized;
};

export const fetchAIVocabulary = async (
  targetLanguage: string,
  nativeLanguage: string,
  options: AIVocabularyOptions = {}
): Promise<VocabularyItem[]> => {
  const levelCycle = normalizeLevelCycle(options.levelCycle);
  const allowRefresh = options.allowRefresh !== false;
  const levelTheme = getVocabularyLevelTheme(levelCycle);
  const cacheKey = getAIVocabularyCacheKey(targetLanguage, nativeLanguage, levelCycle);
  const memory = memoryCache.get(cacheKey);
  if (memory && memory.length > 0) {
    return ensurePhaseOneSupportWords(memory, levelCycle);
  }

  const activeRequest = inFlightRequests.get(cacheKey);
  if (activeRequest) {
    return activeRequest;
  }

  const requestPromise = (async () => {
    const prompt = buildVocabularyPrompt(targetLanguage, nativeLanguage, levelCycle, levelTheme);

    const response = await fetch('/api/ai-vocabulary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        targetLanguage,
        nativeLanguage,
        levelCycle,
      }),
    });

    if (!response.ok) {
      throw new Error('ai-vocabulary-request-failed');
    }

    let data = await response.json();

    // Refresh only when caller allows it (e.g., start of cycle) to avoid mid-progress card churn.
    if (allowRefresh && (data?.source === 'cache-fallback' || data?.stale)) {
      const refreshResponse = await fetch('/api/ai-vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          targetLanguage,
          nativeLanguage,
          levelCycle,
          refresh: true,
        }),
      });

      if (refreshResponse.ok) {
        data = await refreshResponse.json();
      }
    }

    const payload = parsePayload(String(data?.text || ''));
    const rawWords = payload?.words || [];

    const normalized = rawWords
      .map((word, index) => normalizeWord(word, index, 'beginner'))
      .filter((word): word is VocabularyItem => !!word);

    if (normalized.length < 20) {
      throw new Error('ai-vocabulary-invalid-payload');
    }

    const finalized = enforceLevelCounts(normalized, levelCycle);
    writeCachedAIVocabulary(targetLanguage, nativeLanguage, finalized, { levelCycle });
    return finalized;
  })();

  inFlightRequests.set(cacheKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
};

export const prefetchAIVocabulary = (targetLanguage: string, nativeLanguage: string, options: AIVocabularyOptions = {}) => {
  void fetchAIVocabulary(targetLanguage, nativeLanguage, options).catch(() => {
    // Best-effort warmup only.
  });
};

export const prefetchAIVocabularyWindow = (targetLanguage: string, nativeLanguage: string, levelCycle: number) => {
  prefetchAIVocabulary(targetLanguage, nativeLanguage, { levelCycle });
  prefetchAIVocabulary(targetLanguage, nativeLanguage, { levelCycle: levelCycle + 1 });
};
