CREATE TABLE IF NOT EXISTS users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), telegram_id BIGINT UNIQUE, username TEXT,
 first_name TEXT NOT NULL DEFAULT 'Explorer', role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
 fc BIGINT NOT NULL DEFAULT 0 CHECK(fc >= 0), rc BIGINT NOT NULL DEFAULT 0 CHECK(rc >= 0),
 xp BIGINT NOT NULL DEFAULT 0 CHECK(xp >= 0), level INTEGER NOT NULL DEFAULT 1,
 referred_by UUID REFERENCES users(id), referral_count INTEGER NOT NULL DEFAULT 0,
 streak INTEGER NOT NULL DEFAULT 0, last_bonus_day DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mining_sessions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id),
 started_at TIMESTAMPTZ NOT NULL DEFAULT now(), ended_at TIMESTAMPTZ,
 last_claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(), earned_fc BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS mining_one_active ON mining_sessions(user_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS mining_user_idx ON mining_sessions(user_id,started_at DESC);
CREATE TABLE IF NOT EXISTS transactions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL REFERENCES users(id),
 currency TEXT NOT NULL CHECK(currency IN ('FC','RC','XP')),delta BIGINT NOT NULL,
 reason TEXT NOT NULL,reference TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(user_id,currency,reference)
);
CREATE INDEX IF NOT EXISTS transactions_user_idx ON transactions(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS task_claims (
 user_id UUID NOT NULL REFERENCES users(id),task_id TEXT NOT NULL,claim_day DATE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(user_id,task_id,created_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS task_unique_daily ON task_claims(user_id,task_id,claim_day) WHERE claim_day IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS task_unique_once ON task_claims(user_id,task_id) WHERE claim_day IS NULL;
CREATE TABLE IF NOT EXISTS bonus_claims(user_id UUID NOT NULL REFERENCES users(id), claim_day DATE NOT NULL, amount_fc BIGINT NOT NULL, PRIMARY KEY(user_id,claim_day));
CREATE TABLE IF NOT EXISTS purchases(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL REFERENCES users(id),item_id TEXT NOT NULL,price_rc BIGINT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(user_id,item_id));
CREATE TABLE IF NOT EXISTS auth_sessions(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL REFERENCES users(id), token_hash TEXT NOT NULL UNIQUE,expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
