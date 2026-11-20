import { assets } from './assets.js';

const tasks = [
  { id: 'profile', fc: 30, xp: 40, type: 'once' },
  { id: 'daily_explore', fc: 15, xp: 20, type: 'daily' },
  { id: 'daily_mining', fc: 20, xp: 35, type: 'once' },
];
const shop = [
  { id: 'nebula_avatar', price: 20 },
  { id: 'gold_orbit', price: 45 },
  { id: 'cosmic_trail', price: 80 },
];

const miningLevels = [
  { price: 0, rate: 12 },
  { price: 120, rate: 15 },
  { price: 300, rate: 20 },
  { price: 600, rate: 24 },
  { price: 1100, rate: 30 },
  { price: 1800, rate: 40 },
  { price: 2800, rate: 48 },
  { price: 4200, rate: 60 },
  { price: 6000, rate: 75 },
  { price: 8500, rate: 100 },
];

const json = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});
const fail = (message, status = 409) => { throw Object.assign(new Error(message), { status }); };
const day = (date) => new Date(date.getTime() + 5 * 3600000).toISOString().slice(0, 10);

const defaultCampaign = { id: 'telegram_channel_coinova', kind: 'channel', handle: 'coinova', fc: 30, xp: 0, type: 'once' };

async function campaigns(db, env) {
  if (!env.COINOVA_ADMIN_ID) return [defaultCampaign];
  const row = await db.prepare("SELECT json_extract(state, '$.campaigns') AS campaigns FROM accounts WHERE id = ?")
    .bind(env.COINOVA_ADMIN_ID).first();
  const configured = JSON.parse(row?.campaigns ?? '[]');
  return configured.some(task => task.id === defaultCampaign.id) ? configured : [defaultCampaign, ...configured];
}

const exchangeRate = 100000;
const payoutRate = 100;
const minimumPayout = 5000;
const payoutEnabled = env => Boolean(env.COINOVA_ADMIN_ID && env.PAYOUT_CARD_KEY);
const cleanPayout = ({ card, holder, receipt, ...payout }) => ({ ...payout, hasReceipt: Boolean(receipt) });

async function cardCipher(env, value, decrypt = false) {
  const key = await crypto.subtle.importKey('raw', Uint8Array.from(atob(env.PAYOUT_CARD_KEY), char => char.charCodeAt(0)),
    'AES-GCM', false, [decrypt ? 'decrypt' : 'encrypt']);
  if (decrypt) {
    const bytes = Uint8Array.from(atob(value), char => char.charCodeAt(0));
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12)));
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...iv, ...new Uint8Array(ciphertext)));
}

async function payoutAdmin(request, db, env, subject, method, target, id, operation) {
  const operator = await db.prepare('SELECT id FROM accounts WHERE subject = ?').bind(subject).first();
  if (!payoutEnabled(env) || operator?.id !== env.COINOVA_ADMIN_ID) fail('forbidden', 403);
  if (!target && method === 'GET') {
    const rows = await db.prepare(`SELECT accounts.id, json_extract(state,'$.user.first_name') AS name,
      json_extract(state,'$.user.username') AS username, json_extract(state,'$.telegramId') AS telegramId,
      json_remove(p.value,'$.card','$.holder','$.receipt') AS payout FROM accounts, json_each(state,'$.payouts') p
      WHERE json_extract(p.value,'$.status') IN ('pending','processing') ORDER BY json_extract(p.value,'$.createdAt') LIMIT 100`).all();
    return json(rows.results.map(row => ({ ...row, payout: JSON.parse(row.payout) })));
  }
  const query = db.prepare('SELECT state, version FROM accounts WHERE id = ?').bind(target);
  const body = operation === 'receipt' && method === 'POST' ? await input(request, 130000) : {};
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await query.first();
    if (!row) fail('not_found', 404);
    const state = JSON.parse(row.state);
    const payout = state.payouts?.find(item => item.id === id);
    if (!payout) fail('not_found', 404);
    if (method === 'GET' && operation === 'card' && ['pending','processing'].includes(payout.status)) {
      return json({ card: await cardCipher(env, payout.card, true), holder: payout.holder ? await cardCipher(env, payout.holder, true) : undefined });
    }
    if (method !== 'POST') fail('not_found', 404);
    const now = new Date().toISOString();
    if (operation === 'approve' && payout.status === 'pending') payout.status = 'processing';
    else if (operation === 'reject' && ['pending','processing'].includes(payout.status)) {
      payout.status = 'rejected';
      delete payout.card;
      delete payout.holder;
      record(state, 'RC', payout.heldRC ?? (payout.amount / 10), 'payout_refund', now);
    } else if (operation === 'receipt' && payout.status === 'processing') {
      if (typeof body.receipt !== 'string' || !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(body.receipt)) fail('payout_invalid', 400);
      payout.status = 'paid';
      payout.receipt = body.receipt;
      delete payout.card;
      delete payout.holder;
    } else fail('payout_invalid', 409);
    payout.updatedAt = now;
    const result = await db.prepare('UPDATE accounts SET state = ?, version = version + 1 WHERE id = ? AND version = ?')
      .bind(JSON.stringify(state), target, row.version).run();
    if (result.meta.changes === 1) return json({ ok: true });
  }
  fail('try_again');
}

async function input(request, limit = 4096) {
  try {
    const body = await request.text();
    if (body.length <= limit) return JSON.parse(body) ?? {};
  } catch { /* invalid JSON */ }
  fail('invalid_campaign', 400);
}

async function telegramIdentity(data, token) {
  if (!token) fail('telegram_unavailable', 503);
  const { hash, ...signed } = data;
  const age = Date.now() / 1000 - Number(signed.auth_date);
  if (typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash) ||
    !Number.isFinite(age) || age < -30 || age > 300 ||
    !Number.isSafeInteger(signed.id) || signed.id <= 0) fail('telegram_invalid', 400);
  const message = Object.keys(signed).sort().map(key => key + '=' + signed[key]).join('\n');
  const bytes = new TextEncoder();
  const secret = await crypto.subtle.digest('SHA-256', bytes.encode(token));
  const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const signature = Uint8Array.from(hash.match(/../g), byte => parseInt(byte, 16));
  if (!await crypto.subtle.verify('HMAC', key, signature, bytes.encode(message))) fail('telegram_invalid', 400);
  return String(signed.id);
}

async function channelMembership(task, telegramId, token) {
  if (!token) fail('telegram_unavailable', 503);
  let answer;
  try {
    const response = await fetch('https://api.telegram.org/bot' + token + '/getChatMember', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: '@' + task.handle, user_id: Number(telegramId) }),
    });
    answer = await response.json();
  } catch {
    fail('telegram_unavailable', 503);
  }
  if (!answer.ok) fail('telegram_unavailable', 503);
  const member = answer.result;
  return ['creator', 'administrator', 'member'].includes(member.status) ||
    (member.status === 'restricted' && member.is_member === true);
}

function record(state, currency, delta, reason, now, referralFC = 0) {
  if (!delta) return;
  const key = currency.toLowerCase();
  if (delta < 0 && state.user[key] + delta + referralFC < 0) fail(currency === 'FC' ? 'insufficient_fc' : 'insufficient_rc');
  state.user[key] += delta;
  if (currency === 'XP') state.user.level = 1 + Math.floor(Math.sqrt(state.user.xp / 100));
  state.transactions.unshift({ id: crypto.randomUUID(), currency, delta, reason, created_at: now });
  state.transactions = state.transactions.slice(0, 200);
}

function initialState(id, name, now) {
  const state = {
    user: { id, first_name: name, username: '', fc: 0, rc: 0, xp: 0, level: 1,
      streak: 0, last_bonus_day: null, created_at: now },
    transactions: [], claims: [], bonuses: [], purchases: [], mining: null, miningHistory: [],
  };
  record(state, 'RC', 25, 'welcome_credit', now);
  return state;
}

async function account(db, subject, request, now) {
  const query = db.prepare('SELECT version, state FROM accounts WHERE subject = ?').bind(subject);
  const existing = await query.first();
  if (existing) return existing;
  const id = crypto.randomUUID();
  let name = request.headers.get('oai-authenticated-user-full-name') ?? '';
  if (request.headers.get('oai-authenticated-user-full-name-encoding') === 'percent-encoded-utf-8') {
    try { name = decodeURIComponent(name); } catch { name = ''; }
  }
  const ref = new URL(request.url).searchParams.get('ref') ?? '';
  const state = initialState(id, name.trim().slice(0, 80) || 'Explorer', now);
  const telegramId = request.headers.get('oai-authenticated-user-telegram-id');
  if (telegramId && subject === 'telegram:' + telegramId) state.telegramId = telegramId;
  await db.prepare(`INSERT INTO accounts(subject,id,referred_by,state)
    VALUES (?, ?, (SELECT id FROM accounts WHERE id = ?), ?) ON CONFLICT(subject) DO NOTHING`)
    .bind(subject, id, ref, JSON.stringify(state)).run();
  return query.first();
}

async function profileId(db, accountId) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS profile_ids (
    account_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id),
    profile_id INTEGER UNIQUE NOT NULL CHECK (profile_id BETWEEN 10000000 AND 99999999)
  )`).run();
  const query = db.prepare('SELECT profile_id FROM profile_ids WHERE account_id = ?').bind(accountId);
  const existing = await query.first();
  if (existing) return existing.profile_id;
  for (let attempt = 0; attempt < 12; attempt++) {
    const random = crypto.getRandomValues(new Uint32Array(1))[0];
    if (random >= 4230000000) continue;
    const candidate = 10000000 + random % 90000000;
    await db.prepare('INSERT INTO profile_ids VALUES (?, ?) ON CONFLICT DO NOTHING')
      .bind(accountId, candidate).run();
    const row = await query.first();
    if (row) return row.profile_id;
  }
  fail('try_again', 503);
}

async function bootstrap(db, state, now, env) {
  state.user.profile_id = await profileId(db, state.user.id);
  const [referrals, leaderboard] = await db.batch([
    db.prepare(`SELECT id, json_extract(state, '$.user.created_at') AS created_at
      FROM accounts WHERE referred_by = ? ORDER BY created_at DESC`).bind(state.user.id),
    db.prepare(`SELECT json_extract(state, '$.user.first_name') AS first_name,
      json_extract(state, '$.user.level') AS level, json_extract(state, '$.user.xp') AS xp
      FROM accounts ORDER BY json_extract(state, '$.user.xp') DESC, id LIMIT 10`),
  ]);
  state.user.referral_count = referrals.results.length;
  state.user.fc += 50 * state.user.referral_count;
  state.transactions = [...state.transactions, ...referrals.results.slice(0, 50).map(ref => ({
    ...ref, currency: 'FC', delta: 50, reason: 'referral',
  }))].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50);
  const { campaigns: privateCampaigns, telegramBotProofs, telegramId, payouts, exchangeIds, ...visible } = state;
  const isAdmin = Boolean(env.COINOVA_ADMIN_ID && state.user.id === env.COINOVA_ADMIN_ID);
  const configured = await campaigns(db, env);
  return { ...visible, payouts: (payouts ?? []).map(cleanPayout), payoutEnabled: payoutEnabled(env), telegramLinked: Boolean(telegramId), telegramBot: env.TELEGRAM_BOT_TOKEN ? env.TELEGRAM_BOT_USERNAME : undefined,
    isAdmin, ...(isAdmin ? { managedTasks: configured } : {}), miningLevel: state.miningLevel ?? 1, miningLevels, leaders: leaderboard.results, serverTime: now, tasks: [...tasks, ...configured.map(({ secret, ...task }) => task)], shop };
}

async function apply(state, path, date, referralFC, env, db, body) {
  if (path === '/profile/avatar') {
    const avatar = body.avatar;
    if (typeof avatar !== 'string' || avatar.length > 45000 ||
        !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(avatar)) fail('avatar_invalid', 400);
    state.user.avatar = avatar;
    return;
  }
  const now = date.toISOString();
  const today = day(date);
  const upgradeTarget = path.match(/^\/mining\/upgrade\/(\d+)$/)?.[1];
  const level = state.miningLevel ?? 1;
  const rate = miningLevels[level - 1].rate;
  if (upgradeTarget) {
    if (state.mining) fail('mining_upgrade_active');
    const target = Number(upgradeTarget);
    if (target !== level + 1 || target > miningLevels.length) fail('mining_upgrade_order');
    record(state, 'FC', -miningLevels[target - 1].price, 'mining_upgrade', now, referralFC);
    state.miningLevel = target;
    return;
  }
  if (path === '/admin/task') {
    if (!env.COINOVA_ADMIN_ID || state.user.id !== env.COINOVA_ADMIN_ID) fail('forbidden', 403);
    const handle = typeof body.handle === 'string' ? body.handle.trim().replace(/^@/, '').toLowerCase() : '';
    if (!/^[a-z][a-z0-9_]{4,31}$/.test(handle) || !['bot', 'channel'].includes(body.kind) ||
      !Number.isInteger(body.fc) || body.fc < 1 || body.fc > 100000 ||
      (body.kind === 'bot' && !handle.endsWith('bot'))) fail('invalid_campaign', 400);
    const id = 'telegram_' + body.kind + '_' + handle;
    const previous = state.campaigns?.find(task => task.id === id);
    const current = (state.campaigns ?? []).filter(task => task.id !== id);
    if (current.length >= 50) fail('invalid_campaign', 400);
    state.campaigns = [...current, { id, kind: body.kind, handle, fc: body.fc, xp: 0, type: 'once',
      ...(body.kind === 'bot' ? { secret: previous?.secret ?? crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '') } : {}) }];
    return;
  }
  if (path === '/telegram/link') {
    const id = await telegramIdentity(body, env.TELEGRAM_BOT_TOKEN);
    if (state.telegramId && state.telegramId !== id) fail('telegram_invalid');
    state.telegramId = id;
    return;
  }
  if (path === '/wallet/exchange') {
    if (state.exchangeIds?.includes(body.id)) return;
    if (typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/.test(body.id) || !Number.isSafeInteger(body.rc) || body.rc < 1 || !Number.isSafeInteger(body.rc * exchangeRate)) fail('payout_invalid', 400);
    record(state, 'FC', -body.rc * exchangeRate, 'wallet_exchange', now, referralFC);
    record(state, 'RC', body.rc, 'wallet_exchange', now);
    state.exchangeIds = [body.id, ...(state.exchangeIds ?? [])].slice(0,100);
    return;
  }
  if (path === '/wallet/withdraw') {
    if (!payoutEnabled(env)) fail('payout_unavailable', 503);
    if (typeof body.card !== 'string' || !/^(8600|9860)\d{12}$/.test(body.card) ||
      !Number.isSafeInteger(body.amount) || body.amount < minimumPayout || body.amount % payoutRate !== 0) fail('payout_invalid', 400);
    const holder = typeof body.holder === 'string' ? body.holder.trim().replace(/\s+/g, ' ') : '';
    if (holder.length < 3 || holder.length > 100 || !/^\p{L}[\p{L}\p{M} .’'ʻ‘-]* \p{L}[\p{L}\p{M} .’'ʻ‘-]*$/u.test(holder)) fail('payout_invalid', 400);
    const payouts = state.payouts ?? [];
    if (payouts.some(item => item.id === body.id)) return;
    if (typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/.test(body.id) ||
      payouts.some(item => ['pending','processing'].includes(item.status))) fail('payout_pending');
    const heldRC = body.amount / payoutRate;
    record(state, 'RC', -heldRC, 'payout_hold', now);
    state.payouts = [{ id: body.id, amount: body.amount, heldRC, status: 'pending', last4: body.card.slice(-4),
      network: body.card.startsWith('8600') ? 'Uzcard' : 'Humo', card: await cardCipher(env, body.card), holder: await cardCipher(env, holder), createdAt: now }, ...payouts];
    return;
  }
  if (path === '/mining/start') {
    if (state.mining) fail('mining_active');
    state.mining = { id: crypto.randomUUID(), started_at: now, last_claimed_at: now, earned_fc: 0 };
    return;
  }
  if (path === '/mining/claim' || path === '/mining/stop') {
    const mining = state.mining;
    if (!mining) fail('mining_inactive');
    const elapsed = Math.max(0, date.getTime() - Date.parse(mining.last_claimed_at));
    const interval = 60000 / rate;
    const coins = Math.floor(Math.min(elapsed, 3600000) / interval);
    if (!coins && path === '/mining/claim') fail('mining_too_early');
    const xp = Math.floor((mining.earned_fc + coins) / 3) - Math.floor(mining.earned_fc / 3);
    record(state, 'FC', coins, 'mining', now);
    record(state, 'XP', xp, 'mining_xp', now);
    mining.earned_fc += coins;
    if (path === '/mining/stop') {
      state.miningHistory = [{ ...mining, ended_at: now }, ...state.miningHistory].slice(0, 12);
      state.mining = null;
    } else {
      mining.last_claimed_at = new Date(elapsed >= 3600000 ? date.getTime() :
        Date.parse(mining.last_claimed_at) + coins * interval).toISOString();
    }
    return;
  }
  if (path === '/bonus/claim') {
    const last = state.user.last_bonus_day;
    if (last === today) fail('already_claimed');
    const yesterday = day(new Date(date.getTime() - 86400000));
    state.user.streak = last === yesterday ? state.user.streak + 1 : 1;
    state.user.last_bonus_day = today;
    state.bonuses = [{ claim_day: today }, ...state.bonuses].slice(0, 7);
    record(state, 'FC', 10, 'daily_bonus', now);
    record(state, 'XP', 15, 'daily_bonus_xp', now);
    return;
  }
  const taskId = path.match(/^\/tasks\/([^/]+)\/claim$/)?.[1];
  const task = tasks.find(item => item.id === taskId) ?? (taskId?.startsWith('telegram_')
    ? (await campaigns(db, env)).find(item => item.id === taskId) : undefined);
  if (task) {
    const claimDay = task.type === 'daily' ? today : null;
    if (state.claims.some(claim => claim.task_id === task.id && (claimDay === null || claim.claim_day === claimDay))) fail('already_claimed');
    if (task.id === 'daily_mining' && !state.mining && !state.miningHistory.length) fail('mining_required');
    if (task.kind) {
      if (!state.telegramId) fail('telegram_link_required');
      const verified = task.kind === 'channel'
        ? await channelMembership(task, state.telegramId, env.TELEGRAM_BOT_TOKEN)
        : state.telegramBotProofs?.includes(task.id);
      if (!verified) fail(task.kind === 'channel' ? 'telegram_not_subscribed' : 'telegram_task_incomplete');
    }
    state.claims = [...state.claims.filter(claim => !claim.claim_day || claim.claim_day === today || claim.task_id === 'daily_mining'),
      { task_id: task.id, claim_day: claimDay }];
    record(state, 'FC', task.fc, 'task', now);
    record(state, 'XP', task.xp, 'task_xp', now);
    return { awardedFC: task.fc };
  }
  const itemId = path.match(/^\/shop\/([^/]+)\/buy$/)?.[1];
  const item = shop.find(product => product.id === itemId);
  if (item) {
    if (state.purchases.some(purchase => purchase.item_id === item.id)) fail('already_owned');
    record(state, 'RC', -item.price, 'shop', now);
    state.purchases.push({ item_id: item.id, created_at: now });
    return;
  }
  fail('not_found', 404);
}

async function api(request, env, url) {
  const db = env.DB;
  const path = url.pathname.slice(4);
  if (request.method === 'GET' && path === '/health') return json({ ok: true });
  const botTaskId = path.match(/^\/telegram\/bot-proof\/(telegram_bot_[a-z0-9_]+)$/)?.[1];
  if (request.method === 'POST' && botTaskId) {
    const task = (await campaigns(db, env)).find(item => item.id === botTaskId);
    if (!task?.secret || request.headers.get('Authorization') !== 'Bearer ' + task.secret) fail('forbidden', 403);
    const { telegramId } = await input(request);
    if (typeof telegramId !== 'string' || !/^[1-9][0-9]{0,17}$/.test(telegramId)) fail('telegram_invalid', 400);
    const result = await db.prepare(`UPDATE accounts SET state = json_insert(
      CASE WHEN json_type(state, '$.telegramBotProofs') IS NULL
        THEN json_set(state, '$.telegramBotProofs', json('[]')) ELSE state END,
      '$.telegramBotProofs[#]', ?), version = version + 1
      WHERE json_extract(state, '$.telegramId') = ?
        AND NOT EXISTS (SELECT 1 FROM json_each(state, '$.telegramBotProofs') WHERE value = ?)`)
      .bind(task.id, telegramId, task.id).run();
    if (!result.meta.changes && !await db.prepare("SELECT 1 FROM accounts WHERE json_extract(state, '$.telegramId') = ?").bind(telegramId).first()) {
      fail('telegram_link_required', 404);
    }
    return json({ ok: true });
  }
  const subject = request.headers.get('oai-authenticated-user-id');
  if (!subject) return json({ error: 'sign_in_required' }, 401);
  if (request.method === 'POST' && (request.headers.get('Origin') !== url.origin ||
    request.headers.get('X-Coinova-Action') !== '1')) return json({ error: 'forbidden' }, 403);
  const adminPayout = path.match(/^\/admin\/payouts(?:\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/(card|approve|reject|receipt))?$/);
  if (adminPayout) return payoutAdmin(request, db, env, subject, request.method, ...adminPayout.slice(1));
  const receiptId = path.match(/^\/wallet\/receipt\/([0-9a-f-]{36})$/)?.[1];
  if (request.method === 'GET' && receiptId) {
    const row = await db.prepare('SELECT state FROM accounts WHERE subject = ?').bind(subject).first();
    const receipt = JSON.parse(row?.state ?? '{}').payouts?.find(item => item.id === receiptId)?.receipt;
    if (!receipt) fail('not_found', 404);
    return json({ receipt });
  }
  if (request.method === 'GET' && path === '/bootstrap') {
    const now = new Date().toISOString();
    const row = await account(db, subject, request, now);
    return json(await bootstrap(db, JSON.parse(row.state), now, env));
  }
  if (request.method !== 'POST') return json({ error: 'not_found' }, 404);
  const body = path === '/profile/avatar' ? await input(request, 46000) : ['/telegram/link','/admin/task','/wallet/exchange','/wallet/withdraw'].includes(path) ? await input(request) : undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await db.prepare('SELECT version, state FROM accounts WHERE subject = ?').bind(subject).first();
    if (!row) return json({ error: 'sign_in_required' }, 401);
    const state = JSON.parse(row.state);
    const referrals = (path.startsWith('/mining/upgrade/') || path === '/wallet/exchange')
      ? await db.prepare('SELECT COUNT(*) AS count FROM accounts WHERE referred_by = ?').bind(state.user.id).first()
      : null;
    const outcome = await apply(state, path, new Date(), 50 * (referrals?.count ?? 0), env, db, body);
    if (path === '/telegram/link') {
      const result = await db.prepare(`UPDATE accounts SET state = ?, version = version + 1
        WHERE subject = ? AND version = ? AND NOT EXISTS (
          SELECT 1 FROM accounts WHERE subject <> ? AND json_extract(state, '$.telegramId') = ?
        )`).bind(JSON.stringify(state), subject, row.version, subject, state.telegramId).run();
      if (result.meta.changes === 1) return json({ ok: true });
      if (await db.prepare("SELECT 1 FROM accounts WHERE subject <> ? AND json_extract(state, '$.telegramId') = ?").bind(subject, state.telegramId).first()) fail('telegram_invalid');
      continue;
    }
    const result = await db.prepare('UPDATE accounts SET state = ?, version = version + 1 WHERE subject = ? AND version = ?')
      .bind(JSON.stringify(state), subject, row.version).run();
    if (result.meta.changes === 1) return json({ ok: true, ...outcome });
  }
  return json({ error: 'try_again' }, 409);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await api(request, env, url); }
      catch (error) {
        if (!error.status) console.error(error);
        return json({ error: error.status ? error.message : 'server_error' }, error.status ?? 500);
      }
    }
    const asset = assets[url.pathname === '/' ? '/index.html' : url.pathname];
    if (!Array.isArray(asset)) return new Response('Not found', { status: 404 });
    const [type, bytes] = asset;
    return new Response(Uint8Array.from(atob(bytes), value => value.charCodeAt(0)), {
      headers: {
        'Content-Type': type,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
        'Referrer-Policy': 'same-origin',
      },
    });
  },
};
