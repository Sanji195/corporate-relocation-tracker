# Corporate Relocation & Visa Tracker

Two ways to run it:

## 1. Standalone dashboard (no server) — `frontend/index.html`
Just open the file in a browser. Data is stored in your browser's `localStorage`
(use the reset icon in the sidebar to restore sample data).

## 2. Full-stack app (API + database + UI) — `backend/`
```bash
cd backend
cp .env.example .env      # DATABASE_URL="file:./dev.db"
npm install
npm run setup             # prisma generate + db push + seed sample data
npm run dev               # http://localhost:4000
```
The UI served at `/` is `backend/public/index.html` and talks to `/api/*`.

### Deploying to Vercel
Deploy the `backend/` folder. `api/index.js` is a dependency-free serverless
version of the API that serves `public/index.html`. Its data lives in `/tmp`, which
is **ephemeral** (resets on cold starts) — use the Express + Prisma server (or a
hosted DB) when you need data to persist.

### API
| Method | Route | Purpose |
|---|---|---|
| GET/POST | `/api/expatriates` | list / create (creates work permit too) |
| PATCH | `/api/visas/:id/renewal-workflow` | update renewal checklist, status, expiry |
| POST | `/api/travel-logs` | log physical presence days (183-day rule) |
| POST | `/api/expenses` | file a claim (starts as `PENDING`) |
| PATCH | `/api/expenses/:id/status` | `PENDING` / `APPROVED` / `REIMBURSED` / `REJECTED` |
| GET | `/api/visas/expiring?days=90` | *(Express only)* permits expiring soon |
| GET | `/api/expatriates/:id/tax-residency?year=2026` | *(Express only)* 183-day status |
| GET | `/api/expatriates/:id/allowance` | *(Express only)* budget vs. spend |
