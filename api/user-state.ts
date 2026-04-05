const jsonHeaders = {
  'Content-Type': 'application/json',
};

declare const process: {
  env: Record<string, string | undefined>;
};

interface D1Row {
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

function isValidUserKey(userKey: unknown) {
  return typeof userKey === 'string' && userKey.trim().length >= 3 && userKey.length <= 255;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await ensureTable();

    if (req.method === 'GET') {
      const userKey = req.query?.userKey;

      if (!isValidUserKey(userKey)) {
        res.status(400).json({ error: 'Valid userKey is required' });
        return;
      }

      const result = await runD1Query(
        'SELECT state_json, updated_at FROM user_app_state WHERE user_key = ?1 LIMIT 1',
        [String(userKey).trim().toLowerCase()]
      );

      const rows = (result?.result?.[0]?.results || []) as D1Row[];
      if (rows.length === 0) {
        res.status(200).json({ state: null });
        return;
      }

      const row = rows[0];
      let parsedState: unknown = null;
      try {
        parsedState = JSON.parse(row.state_json);
      } catch {
        parsedState = null;
      }

      res.status(200).json({
        state: parsedState,
        updatedAt: row.updated_at,
      });
      return;
    }

    const userKey = req.body?.userKey;
    const state = req.body?.state;

    if (!isValidUserKey(userKey)) {
      res.status(400).json({ error: 'Valid userKey is required' });
      return;
    }

    if (!state || typeof state !== 'object') {
      res.status(400).json({ error: 'State object is required' });
      return;
    }

    const serializedState = JSON.stringify(state);

    if (serializedState.length > 300000) {
      res.status(413).json({ error: 'State payload too large' });
      return;
    }

    await runD1Query(
      `INSERT INTO user_app_state (user_key, state_json, updated_at)
       VALUES (?1, ?2, datetime('now'))
       ON CONFLICT(user_key) DO UPDATE SET
         state_json = excluded.state_json,
         updated_at = datetime('now')`,
      [String(userKey).trim().toLowerCase(), serializedState]
    );

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('user-state route error:', error);
    res.status(500).json({ error: 'Failed to sync user state', details: String(error) });
  }
}
