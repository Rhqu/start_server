# Investment Dashboard

AI-powered investment dashboard with real-time market sentiment analysis from social media (Truth Social & X/Twitter). Analyzes government policy impact on 11 asset categories using GPT-4o.

## Architecture

```
Fullstack_Start/
├── start/                      # TanStack Start frontend (React + Vite)
│   └── src/
│       ├── routes/             # File-based routing
│       │   ├── api/            # Server API endpoints
│       │   │   ├── gov-impact.ts   # Government impact analysis
│       │   │   ├── chat.ts         # AI chat endpoint
│       │   │   ├── market-events.ts
│       │   │   └── portfolio-graph.ts
│       │   └── dashboard/      # Dashboard pages
│       ├── components/         # React components
│       │   └── ui/             # shadcn/ui components
│       ├── lib/
│       │   ├── x-api-client.ts     # X API 2.0 client
│       │   ├── connector-service.ts
│       │   └── config/
│       │       └── asset-categories.ts
│       └── db/                 # Drizzle ORM + SQLite
├── Truthsocialapi/             # FastAPI backend (Docker)
│   ├── server.py               # API server (port 8000)
│   ├── Dockerfile
│   └── truthbrush/             # Truth Social client library
└── docker-compose.yml          # Container orchestration
```

## Tech Stack

- **Frontend**: TanStack Start (React + Vite), Tailwind CSS, shadcn/ui
- **Backend**: FastAPI (Python), Docker
- **Database**: SQLite + Drizzle ORM
- **AI**: OpenAI GPT-4o via Vercel AI SDK
- **Social APIs**: X API 2.0 (Bearer Token), Truth Social (truthbrush)

## Features

### Government Impact Analysis
Analyzes how US government actions affect each asset category by:
- Fetching policy-focused tweets from X API 2.0
- Fetching trending posts from Truth Social
- Tracking government official accounts per sector
- AI-powered sentiment analysis with GPT-4o

### X API 2.0 Integration
- Uses Recent Search endpoint with Bearer Token auth
- Policy-focused queries combining sector keywords + government terms
- Filters for high engagement (100+ interactions) or high follower counts (10k+)
- Tracks government official accounts (SEC, Federal Reserve, Treasury, etc.)

### Government Accounts Tracked
| Sector | Official Accounts |
|--------|-------------------|
| Liquidity | @federalreserve, @USTreasury, @NewYorkFed |
| Stocks | @SECGov, @GaryGensler, @SECEnforcement |
| Bonds | @USTreasury, @federalreserve |
| Commodities | @CFTC, @USDA |
| Crypto | @SECGov, @CFTC, @GaryGensler |
| Real Estate | @HUDgov, @FHA, @FHFA |
| Alternative Energy | @ENERGY, @EPA |
| Agriculture | @USDA, @SecAg |

## Quick Start

### Prerequisites
- Node.js 18+ / Bun
- Docker & Docker Compose
- OpenAI API key
- X API Bearer Token
- Truth Social account

### 1. Install dependencies

```bash
cd start
bun install
```

### 2. Configure environment variables

Create `/.env` (root - for Docker):
```env
TRUTHSOCIAL_USERNAME=your_username
TRUTHSOCIAL_PASSWORD=your_password
```

Create `/start/.env` (for frontend):
```env
OPENAI_API_KEY=sk-proj-...
X_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAA...
```

### 3. Start the backends (Docker)

```bash
docker compose up -d
```

This starts:
- Truth Social API on port 8000

### 4. Start the frontend

```bash
cd start
bun run dev
```

Frontend runs on http://localhost:3000

## Deployment

### Production Build

```bash
cd start
bun run build
```

### Docker Deployment

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f truthsocial-api

# Restart services
docker compose restart truthsocial-api
```

## Environment Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | `start/.env` | OpenAI API key for GPT-4o |
| `X_BEARER_TOKEN` | `start/.env` | X API 2.0 Bearer Token |
| `TRUTHSOCIAL_USERNAME` | `.env` | Truth Social login |
| `TRUTHSOCIAL_PASSWORD` | `.env` | Truth Social password |

## API Endpoints

### Frontend API Routes (port 3000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gov-impact` | POST | Government impact analysis with AI |
| `/api/chat` | POST | AI chat endpoint |
| `/api/market-events` | GET | Market events data |
| `/api/portfolio-graph` | GET | Portfolio graph data |

### Truth Social API (port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sectors` | GET | List all sectors |
| `/sectors/{sector}/trending` | GET | Trending posts for sector |

## Asset Categories

The dashboard supports 11 asset categories with policy-focused analysis:

| Category | ID | Policy Terms |
|----------|-----|--------------|
| Liquidity | `liquidity` | Fed, FOMC, rate hike/cut, Powell |
| Stocks | `stocks` | SEC, regulation, tariff, antitrust |
| Bonds | `bonds` | Treasury, debt ceiling, fiscal policy |
| Commodities | `commodities` | OPEC, sanctions, strategic reserve |
| Crypto | `crypto` | SEC, CFTC, Gensler, enforcement |
| Real Estate | `real-estate` | HUD, FHA, mortgage rates |
| Art & Collectibles | `art-collectibles` | tariff, import tax |
| Private Equity | `private-equity` | SEC, FTC, antitrust, merger |
| Direct Holdings | `direct-holdings` | CFIUS, Commerce, foreign investment |
| Alternative Energy | `alternative-energy` | IRA, DOE, EPA, subsidies |
| Agriculture | `agriculture` | USDA, farm bill, crop subsidies |

## Development Commands

```bash
# Frontend (in start/)
bun run dev          # Dev server (port 3000)
bun run build        # Production build
bun run test         # Run tests

# Database
bun run db:generate  # Generate migrations
bun run db:migrate   # Run migrations
bun run db:studio    # Drizzle Studio

# Docker
docker compose up -d              # Start services
docker compose logs -f            # View logs
docker compose restart            # Restart all

# shadcn components
pnpx shadcn@latest add <component>
```

## Rate Limits

- **X API Free Tier**: ~15-25 requests per 15 minutes
- **Truth Social**: No documented limits
- **Caching**: 5-minute TTL on gov-impact responses

## Code Style

- TypeScript strict mode
- Concise, minimal comments
- Prefer existing patterns in codebase
- Use shadcn/ui for new components
