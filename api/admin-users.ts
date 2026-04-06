const jsonHeaders = {
  'Content-Type': 'application/json',
};

declare const process: {
  env: Record<string, string | undefined>;
};

interface AdminUserRow {
  user_key: string;
  state_json: string;
  updated_at: string;
}

function getD1Config() {
  return {
    accountId: process.env.CF_ACCOUNT_ID || '',
    databaseId: process.env.CF_D1_DATABASE_ID || '',
    apiToken: process.env.CF_API_TOKEN || '',
  };
}

function getAdminPassword() {
  return (process.env.ADMIN_PASSWORD || '').trim();
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
  await runD1Query(`
    CREATE TABLE IF NOT EXISTS user_app_state (
      user_key TEXT PRIMARY KEY,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

function getRequestPassword(req: any) {
  const headerPassword = String(req.headers?.['x-admin-password'] || '').trim();
  const bodyPassword = String(req.body?.password || '').trim();
  return headerPassword || bodyPassword;
}

function isAuthorized(req: any) {
  const expected = getAdminPassword();
  if (!expected) {
    return false;
  }

  return getRequestPassword(req) === expected;
}

function parseDisplayName(stateJson: string, userKey: string) {
  try {
    const parsed = JSON.parse(stateJson) as { displayName?: unknown };
    const displayName = typeof parsed.displayName === 'string' ? parsed.displayName.trim() : '';
    return displayName || userKey.split('@')[0] || 'Player';
  } catch {
    return userKey.split('@')[0] || 'Player';
  }
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function buildResetState(userKey: string, displayName: string) {
  return {
    displayName: displayName.trim() || userKey.split('@')[0] || 'Player',
    nativeLanguage: '',
    targetLanguage: '',
    mode: null,
    currentVocabIndex: 0,
    learnedWords: [],
    quizAnswersInCycle: 0,
    sentenceAnswersInCycle: 0,
    stars: 0,
    currentStreak: 1,
    longestStreak: 1,
    totalXP: 0,
    lastActiveDate: getTodayKey(),
    batteriesRemaining: 5,
    batteryResetAt: null,
    backpackItems: [],
  };
}

async function resetUserHistory(userKey: string) {
  const selectResult = await runD1Query(
    'SELECT state_json FROM user_app_state WHERE user_key = ?1 LIMIT 1',
    [userKey]
  );

  const existingRow = (selectResult?.result?.[0]?.results || []) as Array<{ state_json?: string }>;
  const stateJson = String(existingRow[0]?.state_json || '{}');
  const displayName = parseDisplayName(stateJson, userKey);
  const resetState = buildResetState(userKey, displayName);

  await runD1Query(
    `INSERT INTO user_app_state (user_key, state_json, updated_at)
     VALUES (?1, ?2, datetime('now'))
     ON CONFLICT(user_key) DO UPDATE SET
       state_json = excluded.state_json,
       updated_at = datetime('now')`,
    [userKey, JSON.stringify(resetState)]
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'DELETE' && req.method !== 'PATCH') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await ensureTable();

    if (!isAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (req.method === 'GET') {
      const result = await runD1Query(
        `SELECT user_key, state_json, updated_at
         FROM user_app_state
         ORDER BY updated_at DESC
         LIMIT 500`
      );

      const rows = (result?.result?.[0]?.results || []) as AdminUserRow[];
      const users = rows
        .map((row) => {
          const userKey = String(row.user_key || '').trim().toLowerCase();
          if (!userKey || userKey === 'guest') {
            return null;
          }

          let parsed: { totalXP?: unknown; stars?: unknown; learnedWords?: unknown; currentStreak?: unknown } | null = null;
          try {
            parsed = JSON.parse(row.state_json) as { totalXP?: unknown; stars?: unknown; learnedWords?: unknown; currentStreak?: unknown };
          } catch {
            parsed = null;
          }

          return {
            userKey,
            displayName: parseDisplayName(row.state_json, userKey),
            totalXP: typeof parsed?.totalXP === 'number' ? parsed.totalXP : 0,
            stars: typeof parsed?.stars === 'number' ? parsed.stars : 0,
            learnedWords: Array.isArray(parsed?.learnedWords) ? parsed.learnedWords.length : 0,
            currentStreak: typeof parsed?.currentStreak === 'number' ? parsed.currentStreak : 0,
            updatedAt: row.updated_at,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => !!entry);

      res.status(200).json({ users });
      return;
    }

    const userKey = String(req.body?.userKey || '').trim().toLowerCase();
    if (!userKey) {
      res.status(400).json({ error: 'userKey is required' });
      return;
    }

    if (req.method === 'PATCH') {
      await resetUserHistory(userKey);
      res.status(200).json({ ok: true });
      return;
    }

    await runD1Query('DELETE FROM user_app_state WHERE user_key = ?1', [userKey]);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('admin-users route error:', error);
    res.status(500).json({ error: 'Failed to manage users', details: String(error) });
  }
}
