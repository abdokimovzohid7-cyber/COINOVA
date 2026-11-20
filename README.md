# COINOVA — Premium Cosmic Rewards Platform

COINOVA is a mobile-first, trilingual cosmic virtual rewards application, built with React, TypeScript, Vite, Express and PostgreSQL. **FC and RC are virtual, non-cash units. No withdrawal or guaranteed earnings.**

## ChatGPT Sites edition

The hosted edition uses the same React frontend and runs the API as a Cloudflare
Worker. Sites authenticates requests with ChatGPT identity. The D1 binding
`DB` stores separate account records, balances, reward history and purchases.
Run `npm install` and `npm run build:site` before starting the managed preview.
The preview supplies a local test identity and uses a disposable SQLite database.
The build deploys only the Worker and bundled frontend.

New web accounts receive 25 RC once. A valid referral credits the inviter 50 FC
when a new verified visitor opens their invite link. Daily rewards and tasks
reset at midnight in Tashkent. This Site starts owner-private, so invitees need
Site access before they can join.

The original Express/PostgreSQL and Telegram implementation is retained in
`server/` for a separate deployment. It does not share data with ChatGPT Sites.

## Included

- 10 navigable views: Home, Mining, Tasks, Bonus, Wallet, Profile, Shop, Coin Center, Referrals, Leaderboard.
- UZ/RU/EN centralized translations and mobile/desktop layout.
- CSS glass cards, astronaut SVG, low-cost animations and reduced-motion support.
- Server-side Telegram Mini App initData HMAC verification, expiring bearer sessions, admin role enforcement.
- PostgreSQL persistent users, mining, transactions, bonuses, claims, purchases and referrals.
- Server-side ledger for FC/RC/XP, atomic grants, duplicate-claim protection.
- Daily bonus streak, three verified tasks, mining claim/stop and premium cosmetic purchase endpoints.

## Repository layout

```text
coinova/
├── client/
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx       # Pages, client routes, UI and API interactions
│       ├── i18n.ts        # Uzbek, Russian and English dictionary
│       └── styles.css     # Mobile-first cosmic design system
├── server/
│   ├── sql/001_init.sql  # Durable schema and constraints
│   └── src/
│       ├── auth.ts       # Telegram HMAC and session authentication
│       ├── db.ts         # Pool, atomic database transactions, ledger
│       ├── index.ts      # REST routes, business rules, static hosting
│       └── migrate.ts    # Schema migration
├── .env.example
├── render.yaml
└── package.json
```

## Quick start

Requirements: Node 20+, PostgreSQL 15+.

1. `npm install`
2. `cp .env.example .env` and set `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `PUBLIC_ORIGIN` and a random `JWT_SECRET`.
3. `npm run db:migrate -w server` (PostgreSQL must be running; make sure your `DATABASE_URL` is correct).
4. `npm run dev -w server` and `npm run dev -w client` (frontend: http://localhost:5173, API: http://localhost:4000).
5. In development only, `ALLOW_DEV_AUTH=true` enables a disposable test account through the developer login button. Never enable it in production.
6. `npm run build && npm start` for bundled production frontend + API served by Express.

**Note:** Vite reads `VITE_*` variables during build. For same-origin deployment, leave `VITE_API_URL` blank. Set `VITE_BOT_USERNAME` to your bot's actual username to enable Telegram referral links.

## Telegram Mini App

Use BotFather to create or configure your bot and its Mini App URL. The hosted HTTPS app calls the backend `/api/auth/telegram` endpoint with unmodified `Telegram.WebApp.initData`. The server checks the Telegram HMAC signature with `TELEGRAM_BOT_TOKEN`, checks a 24-hour auth-date window, parses the verified user ID, and creates an opaque 30-day session token. Client local session storage is only a session credential: the source of truth for every balance is PostgreSQL. The server does **not** trust `initDataUnsafe` to authenticate users.

To invite a friend, the client produces `https://t.me/<BOT_USERNAME>?startapp=ref_<UUID>` when `VITE_BOT_USERNAME` is set. Referrals are awarded only to newly registered, verified Telegram users.

## Production deployment on Render

1. Push this repository to your own GitHub repository. **Never commit `.env` or bot secrets.**
2. In Render, create a PostgreSQL database or connect a supported PostgreSQL provider.
3. Create a Web Service from your GitHub repository (or apply the included `render.yaml`).
4. Build: `npm install && npm run build && npm run db:migrate -w server`.
5. Start: `npm start`. Health check: `/api/health`.
6. Set `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `JWT_SECRET`, `PUBLIC_ORIGIN` (your HTTPS domain), `NODE_ENV=production`, and `VITE_BOT_USERNAME` as required.
7. Update BotFather Mini App URL to `https://<your-render-domain>`.

`render.yaml` is a **template**; fill required secrets in Render's environment settings. Deployment does not happen automatically just because the files exist.

## API contract

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/telegram` | Verify Telegram initData and create session |
| POST | `/api/auth/dev` | Local-only developer account |
| POST | `/api/auth/logout` | Revoke session |
| GET | `/api/bootstrap` | Get authenticated user data and rewards status |
| POST | `/api/mining/start` | Start one active mining session |
| POST | `/api/mining/claim` | Settle capped elapsed mining period |
| POST | `/api/mining/stop` | Settle and end mining session |
| POST | `/api/bonus/claim` | Atomic daily streak reward |
| POST | `/api/tasks/:id/claim` | Verified one-time/daily task reward |
| POST | `/api/shop/:id/buy` | Spend RC atomically on virtual item |
| POST | `/api/admin/grant` | Admin-only auditable virtual currency grant |
| GET | `/api/health` | Service health endpoint |

## Pending before public launch

- External social tasks require independent verification per provider; currently only in-platform, server-verifiable tasks exist.
- Add platform administration UI, audit trails for admin actions, fraud detection, session revocation console and bot abuse controls.
- Shop item images are vector placeholders; the purchases and ownership logic is wired to the backend.
- RC->FC exchange is intentionally disabled until audited rates and abuse controls are defined.
- Add comprehensive unit/integration tests with PostgreSQL and E2E mobile/browser testing, observability, backup restore drills, abuse/threat modeling, independent security review.
- Add privacy policy, terms, consent flows and clarify reward economy before opening the app to users.

This is a functional, extensible foundation, **not yet a security-audited production launch**.
