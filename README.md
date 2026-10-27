# Gold Loan Portal

A full-stack gold loan application portal with an AI-powered chat assistant. Customers can get instant gold loan quotes, apply for loans through a step-by-step form or a conversational AI agent, and admins can view all submitted applications.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js · Express 5 · TypeScript · Zod |
| Database | PostgreSQL 16 · Prisma ORM |
| Frontend | React 18 · Vite · Tailwind CSS |
| AI Agent | Google Gemini API (free tier, `gemini-3.8-flash` with fallbacks) |
| Tests | Vitest · Supertest |

## Features

- **Step-by-step loan application form** with live quote calculation (300 ms debounce), plan cards, inline validation
- **AI Chat Assistant** ("Loan Assist") that can look up plans, calculate quotes, and prepare applications — all via function calling (3 tools)
- **Confirmation gate**: the agent never submits directly; it shows a review card that the user must explicitly Confirm
- **Duplicate detection**: same mobile number within 7 days → 409 with existing application ID
- **Mobile masking**: `9876XXXX10` everywhere (API responses, logs, admin table)
- **Integer arithmetic**: all money in paise, weights in milligrams internally — no floating-point rounding errors
- **Admin dashboard**: newest-first lead table with plan filter
- **Robust error handling**: Zod validation → `400 {error:{code,message,fields[]}}`, global error handler (500 JSON, no stack traces)

## Quick Start

### Prerequisites

- Node.js ≥ 20
- Docker (for PostgreSQL) or a local Postgres instance
- A [Gemini API key](https://aistudio.google.com/apikey) (free tier works)

### 1. Clone & install

```bash
git clone <repo-url> && cd gold-loan-portal
npm install            # installs server + client workspaces
```

### 2. Environment

```bash
cp .env.example .env
# Edit .env → set your GEMINI_API_KEY
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Express server port |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/goldloan` | Postgres connection string |
| `GEMINI_API_KEY` | *(required)* | Google Gemini API key |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Primary model (falls back to flash-lite) |
| `GOLD_RATE_24K_PER_GRAM` | `7000` | Gold rate ₹/gram for 24K |

### 3. Start Postgres

```bash
docker compose up -d   # starts Postgres on port 5432
```

### 4. Run database migration & seed

```bash
npm run db:migrate -w server
npm run db:seed -w server
```

This creates two loan plans:
- **PLAN_EMI_01** — Monthly EMI, 10.5% p.a., 75% LTV, 12 months
- **PLAN_BULLET_01** — Bullet Repayment, 12% p.a., 70% LTV, 12 months

### 5. Start dev servers

```bash
npm run dev            # starts backend (port 4000) + frontend (port 5173) concurrently
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Starts server + client concurrently |
| `npm test` | Runs Vitest (unit + API tests, 17 tests) |
| `npm run eval` | Runs 6 AI agent conversation tests against live Gemini |
| `npm run db:migrate -w server` | Runs Prisma migrations |
| `npm run db:seed -w server` | Seeds loan scheme data |
| `npm run db:studio -w server` | Opens Prisma Studio GUI |

## API Endpoints

All endpoints are under `/api/v1`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/loan-schemes` | List active loan plans |
| `POST` | `/quotes` | Calculate quote for all plans |
| `POST` | `/leads` | Submit a loan application |
| `GET` | `/leads?planId=X` | List leads (newest first, optional plan filter) |
| `POST` | `/chat` | AI agent chat (sends message history, returns reply + pending card) |
| `POST` | `/chat/confirm` | Confirm a pending application (from the review card) |

### Error format

All errors follow:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "fields": [{ "field": "karat", "message": "Karat must be 18, 22 or 24" }]
  }
}
```

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Zod validation fails |
| 404 | `PLAN_NOT_FOUND` | Invalid plan ID |
| 409 | `DUPLICATE_APPLICATION` | Same mobile within 7 days (includes `applicationId`) |
| 500 | `INTERNAL_ERROR` | Unexpected error (no stack trace) |

## Loan Maths

```
pureGold   = netWeight × (karat / 24)
goldValue  = pureGold × ₹7,000
loan       = floor(goldValue × min(maxLTV, 0.75))
```

All arithmetic uses integers (milligrams for weight, paise for money) to avoid floating-point errors.

**Verification** (45g net, 22K):
- Pure gold = 45 × 22/24 = 41.25 g
- Gold value = 41.25 × 7000 = ₹2,88,750
- EMI loan (75%) = floor(288750 × 0.75) = **₹2,16,562** ✓
- Bullet loan (70%) = floor(288750 × 0.70) = **₹2,02,125** ✓

## AI Agent Architecture

The chat agent uses Gemini function calling with 3 tools:

| Tool | Purpose |
|------|---------|
| `get_loan_schemes` | Fetch available plans (agent never invents rates) |
| `calculate_quote` | Compute pure gold, value, and loan amounts |
| `submit_application` | Prepare application → shows confirmation card (does NOT submit) |

**Safety guardrails:**
- Only discusses gold loans; declines off-topic requests
- Never does arithmetic — always calls `calculate_quote`
- Never submits without user pressing Confirm (server-side pending store)
- Prompt injection resistant (tested in eval test #6)
- Mobile numbers masked in all logs
- API key never sent to browser (all LLM calls server-side)

## Tests

### Unit + API tests (17 tests)
```bash
npm test
```
- `quoteMath.test.ts` — 4 cases: EMI, Bullet, 18K, LTV cap
- `api.test.ts` — 5 cases: validation 400, scheme listing, quote
- `app.test.ts` — health check
- `leads.test.ts` — 7 cases: create, duplicate 409, masking, list, filter

### AI eval tests (6 conversations)
```bash
npm run eval
```
1. **Happy path** — quote → apply → confirm → lead saved with correct amount
2. **Missing field** — agent asks for gross weight, doesn't guess
3. **Net > gross** — rejects invalid weights, no quote
4. **Duplicate** — 409 with existing application ID
5. **Off-topic** — declines stock advice, steers to gold loans
6. **Prompt injection** — ignores "skip confirmation" attack, no lead saved

## Project Structure

```
gold-loan-portal/
├── server/
│   ├── prisma/           # Schema, migrations, seed
│   ├── src/
│   │   ├── chat/         # AI agent (chatService, tools, pending, llm)
│   │   ├── eval/         # 6-conversation eval script
│   │   ├── services/     # quoteMath, quoteService, leadService
│   │   ├── app.ts        # Express app + error handler
│   │   ├── routes.ts     # API routes
│   │   ├── schemas.ts    # Zod validation schemas
│   │   └── *.test.ts     # Vitest tests
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.tsx       # Tab navigation (Apply / Chat / Admin)
│   │   ├── ApplyFlow.tsx # Step form with live quote
│   │   ├── ChatPanel.tsx # AI chat interface
│   │   ├── LeadsTable.tsx # Admin lead dashboard
│   │   └── ...
│   └── package.json
├── docker-compose.yml    # PostgreSQL 16
├── .env.example
└── package.json          # Monorepo root (workspaces)
```

## What I'd do with more time

- **Docker Compose full stack** — `docker compose up` runs Postgres + backend + frontend, zero local setup
- **Idempotency-Key header** on `POST /leads` for safe retries
- **Rate limiting** on `/chat` endpoint (express-rate-limit)
- **WebSocket** for real-time admin dashboard updates
- **PDF receipt** generation after application confirmation
- **Multi-language support** in the chat agent (Hindi, Tamil, etc.)
- **E2E tests** with Playwright for the full Apply flow + Chat flow
- **CI/CD pipeline** with GitHub Actions (lint, test, eval, deploy)
