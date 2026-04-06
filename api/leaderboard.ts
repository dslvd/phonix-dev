const jsonHeaders = {
  'Content-Type': 'application/json',
};

declare const process: {
  env: Record<string, string | undefined>;
};

interface LeaderboardEntry {
  userKey: string;
  totalXP: number;
  stars: number;
  learnedWords: number;
  currentStreak: number;
}

function getD1Config() {
  return {
    accountId: process.env.CF_ACCOUNT_ID || '',
    databaseId: process.env.CF_D1_DATABASE_ID || '',
    apiToken: process.env.CF_API_TOKEN || '',
  };
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
      body: JSON.stringify({
        sql,
        params,
      }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.errors?.[0]?.message || 'd1-query-failed');
  }

  return data;
}

async function ensureTable() {
  await runD1Query(`
    CREATE TABLE IF NOT EXISTS user_app_state (
      user_key TEXT PRIMARY KEY,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

function parseLeaderboardEntry(userKey: string, rawState: string): LeaderboardEntry | null {
  try {
    const parsed = JSON.parse(rawState) as {
      totalXP?: unknown;
      stars?: unknown;
      learnedWords?: unknown;
      currentStreak?: unknown;
    };

    const totalXP = typeof parsed.totalXP === 'number' ? parsed.totalXP : 0;
    const stars = typeof parsed.stars === 'number' ? parsed.stars : 0;
    const learnedWords = Array.isArray(parsed.learnedWords) ? parsed.learnedWords.length : 0;
    const currentStreak = typeof parsed.currentStreak === 'number' ? parsed.currentStreak : 0;

    if (totalXP <= 0 && stars <= 0 && learnedWords <= 0) {
      return null;
    }

    return {
      userKey,
      totalXP,
      stars,
      learnedWords,
      currentStreak,
    };
  } catch {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await ensureTable();

    const result = await runD1Query(
      `SELECT user_key, state_json
       FROM user_app_state
       ORDER BY updated_at DESC
       LIMIT 200`
    );

    const rows = (result?.result?.[0]?.results || []) as Array<{ user_key?: string; state_json?: string }>;

    const entries = rows
      .map((row) => {
        const userKey = String(row.user_key || '').trim().toLowerCase();
        const stateJson = String(row.state_json || '');
        if (!userKey || userKey === 'guest') {
          return null;
        }

        return parseLeaderboardEntry(userKey, stateJson);
      })
      .filter((entry): entry is LeaderboardEntry => !!entry)
      .sort((a, b) => {
        if (b.totalXP !== a.totalXP) {
          return b.totalXP - a.totalXP;
        }
        if (b.stars !== a.stars) {
          return b.stars - a.stars;
        }
        return b.learnedWords - a.learnedWords;
      })
      .slice(0, 10)
      .map((entry, index) => ({
        rank: index + 1,
        userKey: entry.userKey,
        totalXP: entry.totalXP,
        stars: entry.stars,
        learnedWords: entry.learnedWords,
        currentStreak: entry.currentStreak,
      }));

    res.status(200).json({ entries });
  } catch (error) {
    console.error('leaderboard route error:', error);
    res.status(500).json({ error: 'Failed to load leaderboard', details: String(error) });
  }
}