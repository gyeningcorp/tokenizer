# Tokenizer Cloud — Product & Architecture Plan

## Vision

Tokenizer Cloud is a hosted paid tier ($8/mo) that monetizes the free open-source Tokenizer extension user base. Free users keep full local functionality; Cloud subscribers get session history, spend analytics, monthly reports, and team accounts — all synced automatically from the extension they already use.

---

## What the Extension Already Tracks (Sync-Ready Data)

| Data Point | Source | Storage |
|---|---|---|
| Input / output token counts | `injected.js` intercepts API responses | `chrome.storage.local` |
| Model name (GPT-4o, Claude 3.5, etc.) | Platform detection in `content.js` | In-memory per page |
| Platform (ChatGPT, Claude, Gemini…) | URL matching in `content.js` | In-memory per page |
| Cost (input + output, USD) | Pricing table in `background.js` | `chrome.storage.local` |
| API call count | Incremented in `background.js` | `chrome.storage.local` |
| Session start timestamp | `background.js` DEFAULT_SESSION | `chrome.storage.local` |
| Energy / CO₂ estimates | Calculated in `content.js` overlay | In-memory only |

**Key insight:** The extension already computes everything needed for cloud analytics. We just need to capture per-call events (not just session aggregates) and POST them to a backend.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Extension                     │
│                                                         │
│  content.js ──→ background.js ──→ Cloud Sync Module     │
│  injected.js ↗   (session state)    │                   │
│                                      ↓                  │
│                              POST /api/events           │
│                              (batched, every 30s)       │
└──────────────────────────────┬──────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────┐
│                   Tokenizer Cloud Backend                │
│                                                         │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │ Auth API  │   │  Events API  │   │ Analytics API  │  │
│  │ (JWT)     │   │ (ingest)     │   │ (aggregation)  │  │
│  └────┬─────┘   └──────┬───────┘   └───────┬────────┘  │
│       │                │                    │           │
│       └────────────────┼────────────────────┘           │
│                        ▼                                │
│              ┌──────────────────┐                       │
│              │   PostgreSQL     │                       │
│              │   (Neon / Supabase)                      │
│              └──────────────────┘                       │
│                        │                                │
│              ┌──────────────────┐                       │
│              │   Stripe         │                       │
│              │   (billing)      │                       │
│              └──────────────────┘                       │
└──────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────┐
│              Cloud Dashboard (Web App)                   │
│              tokenizer.dev/dashboard                     │
│                                                         │
│  • Session history timeline                             │
│  • Monthly spend charts (by model, by platform)         │
│  • Cost analytics & budget alerts                       │
│  • Team/shared account management                       │
│  • CSV/PDF export                                       │
└──────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Backend runtime** | Bun | Fast, TypeScript-native, built-in SQLite for dev |
| **Framework** | Hono | Lightweight, edge-ready, works great with Bun |
| **Database** | PostgreSQL (Neon serverless) | Scalable, free tier for MVP, serverless = no ops |
| **Auth** | JWT + Google OAuth (via extension `chrome.identity`) | Zero-friction login for Chrome users |
| **Billing** | Stripe Checkout + Customer Portal | Industry standard, handles subscriptions |
| **Dashboard** | React + Vite (or static HTML for MVP) | Can start simple, scale later |
| **Hosting** | Fly.io or Railway | $5/mo to start, easy Bun deploys |
| **Email** | Resend | Monthly spend reports |

---

## Database Schema (MVP)

```sql
-- Users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  plan        TEXT DEFAULT 'free',  -- 'free' | 'pro' | 'team'
  stripe_id   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- API key for extension auth
CREATE TABLE api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  key_hash    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Token usage events (core data)
CREATE TABLE events (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID REFERENCES users(id),
  platform        TEXT NOT NULL,        -- 'chatgpt', 'claude', 'gemini'
  model           TEXT NOT NULL,        -- 'gpt-4o', 'claude-3-5-sonnet'
  input_tokens    INT NOT NULL,
  output_tokens   INT NOT NULL,
  input_cost      NUMERIC(10,6),
  output_cost     NUMERIC(10,6),
  session_id      TEXT,                 -- groups events into sessions
  recorded_at     TIMESTAMPTZ NOT NULL, -- when event happened in browser
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Sessions (synced from extension)
CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  ext_session_id  TEXT,
  total_input     INT DEFAULT 0,
  total_output    INT DEFAULT 0,
  total_cost      NUMERIC(10,6) DEFAULT 0,
  calls           INT DEFAULT 0,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_events_user_date ON events(user_id, recorded_at);
CREATE INDEX idx_sessions_user ON sessions(user_id, started_at);
```

---

## API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/google` | Exchange Google OAuth token for JWT |
| POST | `/api/auth/apikey` | Generate API key for extension |
| GET | `/api/auth/me` | Get current user + plan status |

### Events (Extension → Cloud)
| Method | Path | Description |
|---|---|---|
| POST | `/api/events` | Batch ingest token usage events |
| POST | `/api/sessions/sync` | Sync current session state |

### Analytics (Cloud → Dashboard)
| Method | Path | Description |
|---|---|---|
| GET | `/api/analytics/summary` | Monthly totals (tokens, cost, calls) |
| GET | `/api/analytics/by-model` | Cost breakdown by model |
| GET | `/api/analytics/by-platform` | Cost breakdown by platform |
| GET | `/api/analytics/daily` | Daily spend timeseries |
| GET | `/api/analytics/sessions` | Paginated session history |

### Billing
| Method | Path | Description |
|---|---|---|
| POST | `/api/billing/checkout` | Create Stripe Checkout session |
| POST | `/api/billing/portal` | Create Stripe Customer Portal link |
| POST | `/api/billing/webhook` | Stripe webhook handler |

---

## Extension Changes Required

### 1. New: `cloud-sync.js` module (loaded by background.js)
- Stores API key in `chrome.storage.local`
- Queues events locally, flushes every 30s (or on session reset)
- Handles offline gracefully (queue persists, retries on reconnect)
- Exposes `cloudSync.isProUser()` for gating features

### 2. Modified: `background.js`
- On each `api_tokens` message, also push to cloud sync queue
- New message type: `cloud_status` → returns sync state for popup

### 3. Modified: `popup.html` / `popup.js`
- "Sync to Cloud" toggle (gated behind Pro check)
- Cloud status indicator (synced / syncing / offline)
- "Upgrade to Pro" link for free users

### 4. New: `manifest.json` additions
- Add `identity` permission (for Google OAuth)
- Add cloud API host to `host_permissions`

---

## Phased Rollout

### Phase 1 — MVP (2 weeks)

**Goal:** Working end-to-end sync from extension to cloud, viewable in a basic dashboard.

| Week | Deliverable |
|---|---|
| **Week 1** | Backend: Bun + Hono server, PostgreSQL schema, `/api/events` ingest endpoint, JWT auth with hardcoded test keys, basic `/api/analytics/summary` endpoint |
| **Week 1** | Extension: `cloud-sync.js` module, queue + flush logic, "Sync to Cloud" toggle in popup |
| **Week 2** | Dashboard: Static HTML page showing session history + monthly spend chart (Chart.js) |
| **Week 2** | Auth: Google OAuth flow via `chrome.identity`, API key generation |
| **Week 2** | Deploy to Fly.io, Neon DB provisioned |

**MVP ships with:**
- ✅ Google login from extension popup
- ✅ Automatic event sync (batched)
- ✅ Basic web dashboard (session list + cost summary)
- ✅ Pro account check (hardcoded for beta testers)

### Phase 2 — Billing & Analytics (2 weeks)

- Stripe integration (checkout, portal, webhooks)
- Rich analytics dashboard (by-model, by-platform, daily charts)
- Monthly email spend reports (Resend)
- Budget alerts (set a monthly cap, get notified)
- CSV/PDF export from dashboard

### Phase 3 — Teams & Polish (2 weeks)

- Team accounts (invite members, shared dashboard)
- Admin view (aggregated team spend)
- Per-member cost attribution
- Dashboard redesign (React + Tailwind)
- Extension onboarding flow for new Cloud users

### Phase 4 — Growth (Ongoing)

- Free tier with limited history (7 days)
- Annual plan discount ($72/yr vs $96/yr)
- Referral program (1 month free per referral)
- API access for power users
- Zapier/webhook integrations

---

## Estimated Effort

| Component | Effort | Notes |
|---|---|---|
| Backend API (auth + events + analytics) | 3-4 days | Bun + Hono is fast to scaffold |
| Database schema + migrations | 0.5 day | Simple schema, Neon setup |
| Extension cloud-sync module | 2 days | Queue, flush, offline handling |
| Extension UI changes (popup toggle) | 0.5 day | Small UI addition |
| Google OAuth flow | 1 day | chrome.identity API |
| Basic web dashboard | 2-3 days | Static HTML + Chart.js |
| Stripe billing | 2 days | Checkout + webhooks |
| Deployment (Fly.io + Neon) | 0.5 day | Docker + fly.toml |
| **Total MVP (Phase 1)** | **~10 days** | |
| **Total through Phase 3** | **~6 weeks** | |

---

## Revenue Model

| Plan | Price | Features |
|---|---|---|
| **Free** | $0 | Full extension (local only), 7-day cloud history |
| **Pro** | $8/mo | Unlimited history, analytics dashboard, monthly reports, CSV export |
| **Team** | $8/mo/seat | Pro + shared dashboard, team admin, per-member attribution |

**Target:** 2% conversion of free users → Pro at $8/mo.

---

## Privacy & Data Handling

- **No conversation content** is ever synced — only token counts, model names, and costs
- All data encrypted in transit (TLS) and at rest (Neon encryption)
- Users can delete all cloud data at any time
- Extension works fully offline — cloud is purely additive
- Privacy policy update needed before launch
