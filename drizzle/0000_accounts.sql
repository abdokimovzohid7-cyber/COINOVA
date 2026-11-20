CREATE TABLE accounts (
  subject TEXT PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  referred_by TEXT REFERENCES accounts(id),
  version INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL CHECK (json_valid(state))
);
--> statement-breakpoint
CREATE INDEX accounts_referrals ON accounts(referred_by);
--> statement-breakpoint
CREATE INDEX accounts_ranking ON accounts(json_extract(state, '$.user.xp') DESC, id);
