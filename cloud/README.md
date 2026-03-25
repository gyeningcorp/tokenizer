# Tokenizer Cloud — Backend

Backend API for Tokenizer Cloud (Pro tier).

## Quick Start

```bash
# Install dependencies
bun install

# Copy env file and configure
cp .env.example .env

# Run database migrations
bun run db:migrate

# Start dev server
bun run dev
```

## Stack

- **Runtime:** Bun
- **Framework:** Hono
- **Database:** PostgreSQL (Neon serverless)
- **Auth:** JWT + Google OAuth
- **Billing:** Stripe
