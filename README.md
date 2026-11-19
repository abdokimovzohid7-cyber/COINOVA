# COINOVA
COINOVA — Global Telegram Mini App Gaming Platform

React + TypeScript frontend and Cloudflare Workers + D1 API starter.

Frontend: `npm install` then `npm run dev`; production build: `npm run build`.
Cloudflare Pages build command: `npm run build`; output directory: `dist`.

API: Create D1 database `coinova-db`, execute `worker/schema.sql`, replace `database_id` in `worker/wrangler.toml`, then deploy from `worker/` with `npx wrangler deploy`.

## Production safety
This starter UI uses demo balances only. Before real users or payouts, verify Telegram WebApp initData server-side on every protected request, add rate limits, admin authorization, transaction auditing, and abuse prevention. Never put bot tokens in frontend code.