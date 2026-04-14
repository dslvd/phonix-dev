declare const process: {
  env: Record<string, string | undefined>;
};

const jsonHeaders = {
  'Content-Type': 'application/json',
};

const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

const memoryCache = new Map<string, { text: string; provider: string; updatedAt: number }>();
const inFlightRefresh = new Map<string, Promise<{ text: string; provider: string }>>();

function normalizeLang(value: unknown, fallback: string) {
  const input = String(value || '').trim();
  return input || fallback;
}

function normalizeLevelCycle(value: unknown) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) {
    return 0;
  }

  return Math.max(0, Math.floor(raw));
}

function getPairKey(targetLanguage: string, nativeLanguage: string, levelCycle: number) {
  return `${targetLanguage.toLowerCase()}::${nativeLanguage.toLowerCase()}::level-${levelCycle}`;
}

function getPairPrefix(targetLanguage: string, nativeLanguage: string) {
  return `${targetLanguage.toLowerCase()}::${nativeLanguage.toLowerCase()}::`;
}

function parseUpdatedAtMillis(value: unknown): number {
  const text = String(value || '').trim();
  if (!text) {
    return 0;
  }

  const timestamp = Date.parse(text.includes('T') ? text : `${text.replace(' ', 'T')}Z`);
  if (!Number.isFinite(timestamp)) {
    return 0;
  }

  return timestamp;
}

function getD1Config() {
  return {
    accountId: process.env.CF_ACCOUNT_ID || '',
    databaseId: process.env.CF_D1_DATABASE_ID || '',
    apiToken: process.env.CF_API_TOKEN || '',
  };
}

function hasD1Config() {
  const { accountId, databaseId, apiToken } = getD1Config();
  return !!accountId && !!databaseId && !!apiToken;
}

async function runD1Query(sql: string, params: unknown[] = []) {
  const { accountId, databaseId, apiToken } = getD1Config();

  if (!accountId || !databaseId || !apiToken) {
    throw new Error('Missing Cloudflare D1 configuration');
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
    {
      method: 'POST',
      headers: {
        ...jsonHeaders,
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ sql, params }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.errors?.[0]?.message || 'd1-query-failed');
  }

  return data;
}

async function ensureTable() {
  if (!hasD1Config()) {
    return;
  }

  await runD1Query(`
    CREATE TABLE IF NOT EXISTS ai_vocabulary_cache (
      pair_key TEXT PRIMARY KEY,
      payload_text TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'cache',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

async function readCachedFromD1(pairKey: string): Promise<{ text: string; provider: string; updatedAt: number } | null> {
  if (!hasD1Config()) {
    return null;
  }

  const result = await runD1Query(
    'SELECT payload_text, provider, updated_at FROM ai_vocabulary_cache WHERE pair_key = ?1 LIMIT 1',
    [pairKey]
  );

  const rows = (result?.result?.[0]?.results || []) as Array<{
    payload_text?: string;
    provider?: string;
    updated_at?: string;
  }>;

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  const text = String(row.payload_text || '').trim();
  if (!text) {
    return null;
  }

  return {
    text,
    provider: String(row.provider || 'cache'),
    updatedAt: parseUpdatedAtMillis(row.updated_at),
  };
}

async function readAnyPairCachedFromD1(
  targetLanguage: string,
  nativeLanguage: string
): Promise<{ text: string; provider: string; updatedAt: number } | null> {
  if (!hasD1Config()) {
    return null;
  }

  const pairPrefix = `${getPairPrefix(targetLanguage, nativeLanguage)}%`;
  const result = await runD1Query(
    `SELECT payload_text, provider, updated_at
     FROM ai_vocabulary_cache
     WHERE pair_key LIKE ?1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [pairPrefix]
  );

  const rows = (result?.result?.[0]?.results || []) as Array<{
    payload_text?: string;
    provider?: string;
    updated_at?: string;
  }>;

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  const text = String(row.payload_text || '').trim();
  if (!text) {
    return null;
  }

  return {
    text,
    provider: String(row.provider || 'cache-fallback'),
    updatedAt: parseUpdatedAtMillis(row.updated_at),
  };
}

function readAnyPairCachedFromMemory(targetLanguage: string, nativeLanguage: string) {
  const pairPrefix = getPairPrefix(targetLanguage, nativeLanguage);
  let latest: { text: string; provider: string; updatedAt: number } | null = null;

  for (const [key, value] of memoryCache.entries()) {
    if (!key.startsWith(pairPrefix)) {
      continue;
    }

    if (!latest || value.updatedAt > latest.updatedAt) {
      latest = value;
    }
  }

  return latest;
}

async function writeCachedToD1(pairKey: string, text: string, provider: string) {
  if (!hasD1Config()) {
    return;
  }

  await runD1Query(
    `INSERT INTO ai_vocabulary_cache (pair_key, payload_text, provider, updated_at)
     VALUES (?1, ?2, ?3, datetime('now'))
     ON CONFLICT(pair_key) DO UPDATE SET
       payload_text = excluded.payload_text,
       provider = excluded.provider,
       updated_at = datetime('now')`,
    [pairKey, text, provider || 'cache']
  );
}

async function callGemini(prompt: string, apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!response.ok) {
    throw new Error(data?.error?.message || 'gemini-failed');
  }

  if (!text) {
    throw new Error('Gemini returned no text');
  }

  return { text: String(text), provider: 'gemini' };
}

async function callGeminiSingle(prompt: string, apiKey: string) {
  return callGemini(prompt, apiKey);
}

async function callOpenRouter(prompt: string, apiKey: string) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://phonix.app',
      'X-Title': 'Phonix',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!response.ok) {
    throw new Error(data?.error?.message || 'openrouter-failed');
  }

  if (!text) {
    throw new Error('OpenRouter returned no text');
  }

  return { text: String(text), provider: 'openrouter' };
}

async function callGroq(prompt: string, apiKey: string) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!response.ok) {
    throw new Error(data?.error?.message || 'groq-failed');
  }

  if (!text) {
    throw new Error('Groq returned no text');
  }

  return { text: String(text), provider: 'groq' };
}

async function generateVocabularyText(prompt: string) {
  const geminiApiKey = process.env.GEMINI_API_KEY;

  const providers = [
    geminiApiKey ? () => callGeminiSingle(prompt, geminiApiKey) : null,
    process.env.OPENROUTER_API_KEY
      ? () => callOpenRouter(prompt, process.env.OPENROUTER_API_KEY as string)
      : null,
    process.env.GROQ_API_KEY ? () => callGroq(prompt, process.env.GROQ_API_KEY as string) : null,
  ].filter(Boolean) as Array<() => Promise<{ text: string; provider: string }>>;

  if (providers.length === 0) {
    throw new Error('No AI provider configured');
  }

  let lastError: unknown = null;

  for (const provider of providers) {
    try {
      return await provider();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('all-providers-failed');
}

async function refreshPair(pairKey: string, prompt: string) {
  const active = inFlightRefresh.get(pairKey);
  if (active) {
    return active;
  }

  const refreshPromise = (async () => {
    const generated = await generateVocabularyText(prompt);
    const now = Date.now();

    memoryCache.set(pairKey, {
      text: generated.text,
      provider: generated.provider,
      updatedAt: now,
    });

    await writeCachedToD1(pairKey, generated.text, generated.provider);

    return generated;
  })();

  inFlightRefresh.set(pairKey, refreshPromise);

  try {
    return await refreshPromise;
  } finally {
    inFlightRefresh.delete(pairKey);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const targetLanguage = normalizeLang(req.body?.targetLanguage, 'Hiligaynon');
    const nativeLanguage = normalizeLang(req.body?.nativeLanguage, 'English');
    const levelCycle = normalizeLevelCycle(req.body?.levelCycle);
    const prompt = String(req.body?.prompt || '').trim();
    const refresh = !!req.body?.refresh;

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const pairKey = getPairKey(targetLanguage, nativeLanguage, levelCycle);

    await ensureTable();

    const memCached = memoryCache.get(pairKey);
    if (memCached && !refresh) {
      const isStale = Date.now() - memCached.updatedAt > CACHE_TTL_MS;

      res.status(200).json({
        text: memCached.text,
        provider: memCached.provider,
        source: 'cache',
        stale: isStale,
      });
      return;
    }

    const memPairFallback = readAnyPairCachedFromMemory(targetLanguage, nativeLanguage);
    if (memPairFallback && !refresh) {
      const isStale = Date.now() - memPairFallback.updatedAt > CACHE_TTL_MS;

      res.status(200).json({
        text: memPairFallback.text,
        provider: memPairFallback.provider,
        source: 'cache-fallback',
        stale: isStale,
      });
      return;
    }

    const d1Cached = await readCachedFromD1(pairKey);
    if (d1Cached && !refresh) {
      memoryCache.set(pairKey, d1Cached);

      const isStale = Date.now() - d1Cached.updatedAt > CACHE_TTL_MS;

      res.status(200).json({
        text: d1Cached.text,
        provider: d1Cached.provider,
        source: 'cache',
        stale: isStale,
      });
      return;
    }

    const d1PairFallback = await readAnyPairCachedFromD1(targetLanguage, nativeLanguage);
    if (d1PairFallback && !refresh) {
      memoryCache.set(pairKey, d1PairFallback);
      const isStale = Date.now() - d1PairFallback.updatedAt > CACHE_TTL_MS;

      res.status(200).json({
        text: d1PairFallback.text,
        provider: d1PairFallback.provider,
        source: 'cache-fallback',
        stale: isStale,
      });
      return;
    }

    const fresh = await refreshPair(pairKey, prompt);

    res.status(200).json({
      text: fresh.text,
      provider: fresh.provider,
      source: 'fresh',
      stale: false,
    });
  } catch (error) {
    console.error('ai-vocabulary route error:', error);
    res.status(500).json({ error: 'Failed to load AI vocabulary', details: String(error) });
  }
}
