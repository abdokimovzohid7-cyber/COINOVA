import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import pg from 'pg';
import worker from '../dist/server/index.js';

const { DATABASE_URL, TELEGRAM_BOT_TOKEN, RENDER_EXTERNAL_URL } = process.env;
if (!DATABASE_URL || !TELEGRAM_BOT_TOKEN || !RENDER_EXTERNAL_URL) {
  throw new Error('DATABASE_URL, TELEGRAM_BOT_TOKEN and RENDER_EXTERNAL_URL are required');
}
const origin = new URL(RENDER_EXTERNAL_URL).origin;
const pool = new pg.Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5000 });
await pool.query(`
  CREATE TABLE IF NOT EXISTS accounts (
    subject TEXT PRIMARY KEY, id TEXT NOT NULL UNIQUE,
    referred_by TEXT REFERENCES accounts(id), version INTEGER NOT NULL DEFAULT 0,
    state TEXT NOT NULL CHECK ((state::jsonb) IS NOT NULL)
  );
  CREATE INDEX IF NOT EXISTS accounts_referrals ON accounts(referred_by);
  CREATE OR REPLACE FUNCTION json_extract(document text, path text) RETURNS text
  LANGUAGE SQL IMMUTABLE STRICT AS $$
    SELECT document::jsonb #>> string_to_array(substr(path, 3), '.')
  $$;
`);
const DB = {
  prepare(source) {
    let index = 0;
    const sql = source
      .replace(/json_extract\(state, '\$\.user\.xp'\) DESC/g, "(json_extract(state, '$.user.xp')::numeric) DESC")
      .replace("json_remove(p.value,'$.card','$.holder','$.receipt')", "(p.value - 'card' - 'holder' - 'receipt')::text")
      .replace("json_each(state,'$.payouts')", "jsonb_array_elements((state::jsonb)->'payouts')")
      .replaceAll('json_extract(p.value,', 'json_extract(p.value::text,')
      .replace(/json_insert\([\s\S]+?'\$\.telegramBotProofs\[#\]', \?\)/,
        "jsonb_set(state::jsonb, '{telegramBotProofs}', COALESCE(state::jsonb->'telegramBotProofs','[]'::jsonb) || jsonb_build_array(?::text))::text")
      .replace("json_each(state, '$.telegramBotProofs')", "jsonb_array_elements_text(state::jsonb->'telegramBotProofs')")
      .replace(/\?/g, () => '$' + ++index);
    const bind = (...values) => ({
      first: async () => (await pool.query(sql, values)).rows[0],
      all: async () => ({ results: (await pool.query(sql, values)).rows }),
      run: async () => ({ meta: { changes: (await pool.query(sql, values)).rowCount } }),
    });
    return { ...bind(), bind };
  },
  batch: queries => Promise.all(queries.map(query => query.all())),
};
const key = createHmac('sha256', 'WebAppData').update(TELEGRAM_BOT_TOKEN).digest();

function telegramUser(initData) {
  if (!initData || initData.length > 8192) return;
  const params = new URLSearchParams(initData);
  if (params.size !== new Set(params.keys()).size) return;
  const hash = params.get('hash');
  const authDate = Number(params.get('auth_date'));
  const age = Date.now() / 1000 - authDate;
  if (!hash || !/^[a-f0-9]{64}$/.test(hash) || !Number.isFinite(age) || age < -30 || age > 86400) return;
  params.delete('hash');
  params.sort();
  const check = [...params].map(([name, value]) => name + '=' + value).join('\n');
  const expected = createHmac('sha256', key).update(check).digest();
  if (!timingSafeEqual(Buffer.from(hash, 'hex'), expected)) return;
  try {
    const user = JSON.parse(params.get('user'));
    if (Number.isSafeInteger(user?.id) && user.id > 0) return user;
  } catch { /* Invalid Telegram payload */ }
}

createServer(async (req, res) => {
  try {
    const url = new URL(origin + req.url);
    const headers = new Headers(req.headers);
    for (const name of ['id','full-name','full-name-encoding','telegram-id']) {
      headers.delete('oai-authenticated-user-' + name);
    }
    const user = telegramUser(headers.get('x-coinova-telegram'));
    headers.delete('x-coinova-telegram');
    if (user) {
      headers.set('oai-authenticated-user-id', 'telegram:' + user.id);
      headers.set('oai-authenticated-user-telegram-id', String(user.id));
      headers.set('oai-authenticated-user-full-name', encodeURIComponent(String(user.first_name ?? '').slice(0,80)));
      headers.set('oai-authenticated-user-full-name-encoding', 'percent-encoded-utf-8');
    }
    const request = new Request(url, {
      headers, method: req.method,
      ...(req.method === 'GET' || req.method === 'HEAD' ? {} : { body: req, duplex: 'half' }),
    });
    const response = await worker.fetch(request, { ...process.env, TELEGRAM_BOT_USERNAME: 'coin_ova_bot', DB });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(req.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'server_error' }));
  }
}).listen(Number(process.env.PORT) || 10000, '0.0.0.0');
