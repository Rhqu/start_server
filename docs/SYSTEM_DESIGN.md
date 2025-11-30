# System Design Document

Comprehensive technical documentation for the Investment Dashboard system.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [External Integrations](#external-integrations)
6. [Data Flow](#data-flow)
7. [Database Design](#database-design)
8. [API Specifications](#api-specifications)
9. [Authentication & Security](#authentication--security)
10. [Caching Strategy](#caching-strategy)
11. [Technology Stack](#technology-stack)

---

## System Overview

### Purpose
AI-powered investment dashboard that analyzes real-time social media sentiment from Truth Social and X (Twitter) to assess how US government policies impact 11 asset categories. Uses GPT-4o for intelligent analysis and provides actionable insights with source citations.

### Key Features
- **Government Impact Analysis**: Tracks policy announcements, regulatory changes, and official statements
- **Multi-Source Sentiment**: Combines Truth Social and X API data for comprehensive coverage
- **11 Asset Categories**: From liquidity to agriculture with sector-specific policy terms
- **Real-Time Streaming**: Server-sent events for live AI analysis
- **Quality Filtering**: Engagement thresholds and government account prioritization
- **Extensible Connectors**: Framework for adding external news/data sources

---

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser Client                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    React 19 + TanStack Start                 │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │  │Dashboard │  │Portfolio │  │ Network  │  │ Settings │    │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Frontend Server (Port 3000)                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     TanStack Start + Nitro                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │   │
│  │  │ /api/gov-    │  │ /api/chat    │  │ /api/market- │       │   │
│  │  │   impact     │  │              │  │   events     │       │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │   │
│  │  │ X API Client │  │ Connector    │  │ Qplix Client │       │   │
│  │  │              │  │ Service      │  │              │       │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   OpenAI API    │  │  X API 2.0      │  │ Docker :8000    │
│   (GPT-4o)      │  │  (Twitter)      │  │ ┌─────────────┐ │
│                 │  │                 │  │ │  FastAPI    │ │
│                 │  │                 │  │ │      +      │ │
│                 │  │                 │  │ │ TruthBrush  │ │
│                 │  │                 │  │ └─────────────┘ │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │  Truth Social   │
                                          │      API        │
                                          └─────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| React Frontend | UI rendering, user interactions, state management |
| TanStack Start | Server-side rendering, API routes, routing |
| API Routes | Business logic, external API orchestration |
| X API Client | Twitter/X data fetching with policy queries |
| FastAPI | Truth Social API wrapper, sector endpoints |
| TruthBrush | Low-level Truth Social API client |
| OpenAI | AI analysis, sentiment scoring, summarization |

---

## Frontend Architecture

### Technology Stack
- **Framework**: TanStack Start (React 19 + Vite + Nitro)
- **Routing**: TanStack Router (file-based)
- **State**: TanStack Query (server state), React Context (UI state)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Charts**: Recharts
- **3D/Graphs**: XYFlow, Three.js

### Directory Structure

```
start/src/
├── routes/                    # File-based routing
│   ├── __root.tsx            # Root layout
│   ├── dashboard.tsx         # Dashboard layout wrapper
│   ├── dashboard/
│   │   ├── index.tsx         # Main intelligence page
│   │   ├── portfolio.tsx     # Portfolio view
│   │   ├── network.tsx       # Network graph
│   │   ├── connectors.tsx    # Connector management
│   │   └── settings.tsx      # App settings
│   └── api/                  # Server API endpoints
│       ├── gov-impact.ts     # Government impact analysis
│       ├── chat.ts           # AI chat with tools
│       ├── market-events.ts  # Market events
│       └── portfolio-graph.ts
├── components/
│   ├── ui/                   # shadcn/ui (50+ components)
│   ├── ai-elements/          # AI-specific UI
│   │   ├── GovImpactPanel.tsx
│   │   ├── ConversationMessage.tsx
│   │   └── ChainOfThought.tsx
│   ├── portfolio/            # Portfolio components
│   └── market/               # Market sidebar
├── lib/
│   ├── x-api-client.ts       # X API 2.0 client
│   ├── connector-service.ts  # External connectors
│   ├── qplix.ts              # Qplix wealth API
│   ├── config/
│   │   └── asset-categories.ts
│   ├── types/
│   │   ├── social-post.ts
│   │   └── connector.ts
│   └── schemas/              # Zod schemas
└── db/
    ├── index.ts              # Drizzle client
    └── schema.ts             # Database schema
```

### State Management

```typescript
// Server State - TanStack Query
const { data: govImpact } = useQuery({
  queryKey: ['gov-impact', sector],
  queryFn: () => fetchGovImpact(sector)
})

// UI State - React Context
const { theme, setTheme } = useSettings()

// URL State - TanStack Router
const { selectedCategory } = Route.useSearch()
```

### API Route Pattern

```typescript
// routes/api/gov-impact.ts
export const Route = createFileRoute('/api/gov-impact')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = await request.json()

        const result = streamText({
          model: openai('gpt-4o'),
          system: systemPrompt,
          messages,
          tools: { governmentImpact: governmentImpactTool }
        })

        return result.toTextStreamResponse()
      }
    }
  }
})
```

---

## Backend Architecture

### FastAPI Server

**Location**: `/Truthsocialapi/server.py`
**Port**: 8000
**Container**: Docker

```python
# Core FastAPI setup
app = FastAPI(title="Truth Social Investment API")
app.add_middleware(CORSMiddleware, allow_origins=["*"])

# Endpoints
GET  /                           # Health check
GET  /sectors                    # List all sectors
GET  /sectors/{sector}           # Sector info
GET  /sectors/{sector}/trending  # Trending posts (gov focus)
GET  /sectors/{sector}/posts     # Top posts by engagement
```

### Investment Client

**Location**: `/Truthsocialapi/truthbrush/truthbrush/investment_client.py`

```python
@dataclass
class SectorQueries:
    name: str              # Display name
    name_de: str           # German name
    queries: list[str]     # Search terms
    hashtags: list[str]    # Associated hashtags
    accounts: list[str]    # Government accounts

# 11 Sectors defined with:
# - Keywords for search
# - Hashtags to track
# - Government accounts to monitor
```

### TruthBrush API Client

**Location**: `/Truthsocialapi/truthbrush/truthbrush/api.py`

- HTTP client using `curl_cffi` (bypasses Cloudflare)
- Session-based authentication
- Methods: search, get_statuses, get_trends

---

## External Integrations

### X API 2.0 (Twitter)

**Client**: `/start/src/lib/x-api-client.ts`

```typescript
// Configuration per sector
interface SectorQueryConfig {
  keywords: string[]     // e.g., ["stock market", "S&P 500"]
  policyTerms: string[]  // e.g., ["SEC", "regulation", "tariff"]
}

// Government accounts per sector
const GOV_ACCOUNTS = {
  stocks: ['SECGov', 'GaryGensler', 'SECEnforcement'],
  liquidity: ['federalreserve', 'USTreasury', 'NewYorkFed'],
  crypto: ['SECGov', 'CFTC', 'GaryGensler'],
  // ... 11 sectors
}

// Query strategy: Two parallel queries
// 1. Policy: (keywords) (policy terms) -is:retweet lang:en
// 2. Officials: (from:account1 OR from:account2) -is:retweet
```

**Authentication**: Bearer Token
**Endpoint**: `https://api.twitter.com/2/tweets/search/recent`
**Rate Limit**: ~15-25 requests per 15 minutes (free tier)

### Truth Social API

**Client**: TruthBrush library (Python)

**Authentication**: Username + Password → Session token
**Methods**:
- Search by hashtags
- Search by keywords
- Get trending posts

### OpenAI GPT-4o

**SDK**: Vercel AI SDK (`@ai-sdk/openai`)

```typescript
import { openai } from '@ai-sdk/openai'
import { streamText, tool } from 'ai'

const result = streamText({
  model: openai('gpt-4o'),
  system: systemPrompt,
  messages: coreMessages,
  tools: { governmentImpact: governmentImpactTool },
  toolChoice: 'auto',
  stopWhen: stepCountIs(4)
})
```

**Features Used**:
- Streaming text generation
- Tool calling
- JSON mode for structured output

---

## Data Flow

### Government Impact Analysis

```
1. User clicks "Analyze Gov Impact" on dashboard
   └─> handleAnalyzeGovImpact() triggered

2. Frontend POST /api/gov-impact
   └─> { messages: [{ role: 'user', content: 'Analyze stocks...' }] }

3. API route initializes Vercel AI SDK
   └─> streamText() with governmentImpactTool

4. GPT-4o calls governmentImpactTool
   └─> Tool executes with sector parameter

5. Tool fetches data in parallel:
   ├─> X API: searchXTweets(sector, limit)
   │   ├─> Policy query (50 tweets max)
   │   └─> Government accounts query (20 tweets max)
   │
   ├─> Truth Social: fetchTruthSocialPosts(sector)
   │   └─> FastAPI /sectors/{sector}/trending
   │
   └─> Connectors: fetchGovConnectorData(sector)
       └─> External news/data sources

6. Data normalization pipeline:
   ├─> Normalize X tweets to SocialPost format
   ├─> Normalize Truth Social posts to SocialPost format
   ├─> Deduplicate by ID
   ├─> Filter by quality:
   │   ├─> Engagement >= 100 (likes + retweets + replies)
   │   ├─> Followers >= 10,000
   │   └─> Government accounts (always included)
   └─> Sort by: Gov priority → Engagement

7. Combined data returned to GPT-4o
   └─> Posts + connector context + system prompt

8. GPT-4o generates analysis:
   └─> Structured JSON response with:
       - sentiment: { overall, score, explanation }
       - summary: "3-5 sentence analysis"
       - governmentActions: ["action1", ...]
       - citations: [{ postId, quote, sentiment, source }]
       - keyTakeaways: ["takeaway1", ...]

9. Response streamed to frontend
   └─> Server-sent events (SSE)

10. UI renders analysis
    └─> GovImpactPanel component
```

### Post Normalization

```typescript
// Input: X API tweet
{
  id: "123",
  text: "SEC announces...",
  author_id: "456",
  public_metrics: { like_count: 500, retweet_count: 100 }
}

// Output: Normalized SocialPost
{
  id: "123",
  content: "SEC announces...",
  source: "twitter",
  author_handle: "SECGov",
  author_display_name: "U.S. Securities and Exchange Commission",
  author_followers: 1200000,
  engagement: 650,  // likes + retweets + replies
  citationId: 1,
  url: "https://x.com/SECGov/status/123"
}
```

---

## Database Design

### Schema (Drizzle ORM + SQLite)

```typescript
// src/db/schema.ts
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  role: text('role').notNull(),      // 'user' | 'assistant'
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
})
```

### Connector Configuration (JSON)

```json
// db/connectors.json
{
  "connectors": [
    {
      "id": "news-api",
      "name": "Financial News",
      "url": "https://api.example.com/news",
      "apiKey": "encrypted_key",
      "dataPath": "articles",
      "categories": ["stocks", "bonds"],
      "tools": ["timeline", "government"],
      "enabled": true
    }
  ]
}
```

---

## API Specifications

### POST /api/gov-impact

**Request**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Analyze how the US government is currently affecting the stocks sector."
    }
  ]
}
```

**Response** (Streaming JSON):
```json
{
  "sentiment": {
    "overall": "mixed",
    "score": 0.2,
    "explanation": "Posts show mixed views on tariffs..."
  },
  "summary": "Current government policies including tariff implementations and SEC regulations are creating uncertainty in the stock market...",
  "governmentActions": [
    "SEC enforcement actions",
    "Tariff announcements",
    "Trade negotiations"
  ],
  "citations": [
    {
      "postId": 1,
      "quote": "SEC announces new crypto regulations...",
      "sentiment": "bearish",
      "source": "twitter",
      "author_handle": "SECGov",
      "author_display_name": "SEC",
      "replies_count": 100,
      "reblogs_count": 500,
      "favourites_count": 2000
    }
  ],
  "externalInsights": "Financial news indicates...",
  "keyTakeaways": [
    "Regulatory uncertainty affecting market sentiment",
    "Tariff policies creating sector volatility"
  ],
  "sourceBreakdown": {
    "truthSocial": 5,
    "twitter": 8
  }
}
```

### GET /sectors/{sector}/trending

**Response**:
```json
{
  "sector": "stocks",
  "hashtags": ["stocks", "stockmarket", "SP500"],
  "posts": [
    {
      "id": "123",
      "content": "Markets responding to...",
      "author_handle": "realDonaldTrump",
      "author_display_name": "Donald J. Trump",
      "replies_count": 1000,
      "reblogs_count": 5000,
      "favourites_count": 20000,
      "created_at": "2024-01-15T10:30:00Z",
      "url": "https://truthsocial.com/@realDonaldTrump/..."
    }
  ]
}
```

---

## Authentication & Security

### Credentials

| Service | Type | Storage |
|---------|------|---------|
| OpenAI | API Key | `start/.env` |
| X API | Bearer Token | `start/.env` |
| Truth Social | Username/Password | `.env` (root) |
| Qplix | Bearer Token | Hardcoded (to be migrated) |

### Environment Files

```bash
# /.env (Docker services)
TRUTHSOCIAL_USERNAME=username
TRUTHSOCIAL_PASSWORD=password

# /start/.env (Frontend)
OPENAI_API_KEY=sk-proj-...
X_BEARER_TOKEN=AAAA...
```

### Security Considerations

- API keys stored in environment variables (not committed)
- CORS enabled for development (restrict in production)
- No user authentication (single-user dashboard)
- SQLite file-based (no network exposure)

---

## Caching Strategy

### In-Memory Cache

```typescript
// Gov Impact cache (5-minute TTL)
const sectorCache = new Map<string, {
  data: CombinedPostsResult
  timestamp: number
}>()

const CACHE_TTL = 5 * 60 * 1000  // 5 minutes

// Check cache before fetching
const cached = sectorCache.get(cacheKey)
if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
  return cached.data
}
```

### Cache Locations

| Data | TTL | Storage |
|------|-----|---------|
| Gov Impact results | 5 min | In-memory Map |
| Connector data | Per-request | None |
| React Query | Configurable | In-memory |

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19 | UI framework |
| TanStack Start | Latest | Full-stack framework |
| TanStack Router | Latest | File-based routing |
| TanStack Query | Latest | Server state management |
| Tailwind CSS | 4 | Styling |
| shadcn/ui | Latest | UI components |
| Recharts | Latest | Charts |
| Vite | Latest | Build tool |
| TypeScript | 5.x | Type safety |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.13 | Runtime |
| FastAPI | Latest | API framework |
| Pydantic | Latest | Data validation |
| curl_cffi | Latest | HTTP client |
| Uvicorn | Latest | ASGI server |

### AI/ML

| Technology | Purpose |
|------------|---------|
| Vercel AI SDK | LLM integration |
| OpenAI GPT-4o | Analysis & generation |
| Zod | Schema validation |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Orchestration |
| SQLite | Database |
| Drizzle ORM | Database client |
| Bun | Package manager & runtime |

---

## Appendix: 11 Asset Categories

| ID | Name | Keywords | Policy Terms | Gov Accounts |
|----|------|----------|--------------|--------------|
| `liquidity` | Liquidity | Fed, Federal Reserve, interest rates | rate hike, FOMC, Powell | @federalreserve, @USTreasury |
| `stocks` | Stocks | stock market, S&P 500, NYSE | SEC, regulation, tariff | @SECGov, @GaryGensler |
| `bonds` | Bonds | treasury, yields, fixed income | debt ceiling, fiscal policy | @USTreasury, @federalreserve |
| `commodities` | Commodities | oil, gold, crude, metals | OPEC, sanctions, tariff | @CFTC, @USDA |
| `crypto` | Crypto | bitcoin, ethereum, cryptocurrency | SEC, CFTC, enforcement | @SECGov, @CFTC |
| `real-estate` | Real Estate | housing, mortgage, REIT | HUD, FHA, mortgage rates | @HUDgov, @FHA |
| `art-collectibles` | Art & Collectibles | auction, Sothebys, Christies | tariff, import tax | @NEAarts |
| `private-equity` | Private Equity | VC, M&A, IPO, buyout | SEC, FTC, antitrust | @SECGov, @FTC |
| `direct-holdings` | Direct Holdings | investment, acquisition, stake | CFIUS, Commerce | @CommerceGov |
| `alternative-energy` | Alternative Energy | solar, EV, renewable, wind | IRA, DOE, EPA, subsidies | @ENERGY, @EPA |
| `agriculture` | Agriculture | farming, crops, wheat, corn | USDA, farm bill, tariff | @USDA, @SecAg |
