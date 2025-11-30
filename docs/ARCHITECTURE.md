# System Architecture Diagrams

Visual diagrams of the Investment Dashboard system architecture using Mermaid syntax.

## High-Level Architecture

```mermaid
graph TB
    subgraph Client["Browser Client"]
        UI[React Frontend<br/>TanStack Start]
    end

    subgraph Frontend["Frontend Server :3000"]
        Router[TanStack Router]
        API[API Routes]
        XClient[X API Client]
        Connectors[Connector Service]
    end

    subgraph Backend["Docker Container :8000"]
        FastAPI[FastAPI Server]
        TruthBrush[TruthBrush Client]
    end

    subgraph External["External Services"]
        OpenAI[OpenAI GPT-4o]
        XAPI[X API 2.0]
        TruthSocial[Truth Social API]
        Qplix[Qplix Wealth API]
    end

    subgraph Storage["Data Storage"]
        SQLite[(SQLite DB)]
        Cache[(In-Memory Cache)]
        ConnectorJSON[connectors.json]
    end

    UI --> Router
    Router --> API
    API --> XClient
    API --> Connectors
    API --> FastAPI
    API --> OpenAI

    XClient --> XAPI
    FastAPI --> TruthBrush
    TruthBrush --> TruthSocial
    Connectors --> ConnectorJSON
    API --> SQLite
    API --> Cache
    UI -.-> Qplix
```

## Component Interaction

```mermaid
graph LR
    subgraph Dashboard["Dashboard UI"]
        Chart[Portfolio Chart]
        GovPanel[Gov Impact Panel]
        ChatUI[Chat Interface]
    end

    subgraph APIs["API Layer"]
        GovAPI[/api/gov-impact]
        ChatAPI[/api/chat]
        MarketAPI[/api/market-events]
    end

    subgraph Services["Services"]
        XService[X API Service]
        TSService[Truth Social Service]
        AIService[AI Analysis]
    end

    Chart --> GovAPI
    GovPanel --> GovAPI
    ChatUI --> ChatAPI

    GovAPI --> XService
    GovAPI --> TSService
    GovAPI --> AIService
    ChatAPI --> AIService
```

## Government Impact Analysis Flow

```mermaid
sequenceDiagram
    participant U as User
    participant D as Dashboard
    participant API as /api/gov-impact
    participant AI as GPT-4o
    participant X as X API 2.0
    participant TS as Truth Social
    participant C as Connectors

    U->>D: Click "Analyze Gov Impact"
    D->>API: POST {sector: "stocks"}

    API->>AI: streamText() with governmentImpactTool
    AI->>API: Tool call: fetch sector data

    par Parallel Fetches
        API->>X: Policy query + Gov accounts
        X-->>API: Tweets (50 max)
        API->>TS: /sectors/stocks/trending
        TS-->>API: Posts (15 max)
        API->>C: Fetch external news
        C-->>API: News data
    end

    API->>API: Normalize & filter posts
    API->>AI: Combined context + posts
    AI-->>API: Stream JSON response
    API-->>D: SSE stream
    D-->>U: Render analysis
```

## Data Normalization Pipeline

```mermaid
flowchart TD
    subgraph Sources["Data Sources"]
        X[X API Response]
        TS[Truth Social Response]
    end

    subgraph Normalize["Normalization"]
        NX[Normalize X Tweets]
        NTS[Normalize TS Posts]
    end

    subgraph Filter["Quality Filters"]
        FE[Engagement > 100]
        FF[Followers > 10k]
        FG[Gov Account?]
    end

    subgraph Output["Combined Output"]
        Dedup[Deduplicate]
        Sort[Sort by Priority]
        Limit[Top N Posts]
    end

    X --> NX
    TS --> NTS

    NX --> FE
    NX --> FF
    NX --> FG
    NTS --> FE
    NTS --> FF
    NTS --> FG

    FE --> Dedup
    FF --> Dedup
    FG --> Dedup

    Dedup --> Sort
    Sort --> Limit
```

## X API Query Strategy

```mermaid
flowchart LR
    subgraph Sector["Sector: stocks"]
        K[Keywords:<br/>stock market, S&P 500]
        P[Policy Terms:<br/>SEC, regulation, tariff]
        G[Gov Accounts:<br/>@SECGov, @GaryGensler]
    end

    subgraph Queries["X API Queries"]
        Q1["Query 1: Policy<br/>(keywords) (policy) -is:retweet"]
        Q2["Query 2: Officials<br/>(from:SECGov OR from:...) -is:retweet"]
    end

    subgraph Results["Results"]
        R1[Policy Tweets]
        R2[Gov Tweets]
        Combined[Combined & Filtered]
    end

    K --> Q1
    P --> Q1
    G --> Q2

    Q1 --> R1
    Q2 --> R2

    R1 --> Combined
    R2 --> Combined
```

## AI Tool Integration

```mermaid
flowchart TB
    subgraph Request["User Request"]
        Msg[Analyze stocks sector]
    end

    subgraph AISDK["Vercel AI SDK"]
        Stream[streamText]
        Tool[governmentImpactTool]
    end

    subgraph Execution["Tool Execution"]
        Validate[Validate Sector]
        CheckCache[Check Cache]
        Fetch[Fetch All Sources]
        Combine[Combine Posts]
    end

    subgraph Response["AI Response"]
        Analyze[GPT-4o Analysis]
        JSON[Structured JSON]
    end

    Msg --> Stream
    Stream --> Tool
    Tool --> Validate
    Validate --> CheckCache
    CheckCache -->|Miss| Fetch
    CheckCache -->|Hit| Analyze
    Fetch --> Combine
    Combine --> Analyze
    Analyze --> JSON
```

## Database Schema

```mermaid
erDiagram
    MESSAGES {
        int id PK
        text role
        text content
        timestamp created_at
    }

    CONNECTORS {
        string id PK
        string name
        string url
        string apiKey
        json categories
        json tools
        boolean enabled
    }

    ASSET_CATEGORIES {
        string id PK
        string label
        string color
        json keywords
        string theme
    }
```

## Deployment Architecture

```mermaid
graph TB
    subgraph Host["Host Machine"]
        subgraph Docker["Docker Compose"]
            TS[truthsocial-api<br/>:8000]
        end

        subgraph Node["Node/Bun Runtime"]
            FE[TanStack Start<br/>:3000]
        end

        subgraph Files["File System"]
            ENV[.env files]
            DB[(SQLite)]
            JSON[connectors.json]
        end
    end

    subgraph Cloud["External Cloud Services"]
        OpenAI[OpenAI API]
        Twitter[X API 2.0]
        TruthSocialAPI[Truth Social]
    end

    FE --> TS
    FE --> OpenAI
    FE --> Twitter
    TS --> TruthSocialAPI
    FE --> DB
    FE --> JSON
    TS --> ENV
    FE --> ENV
```

## Request/Response Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant V as Vite Dev Server
    participant N as Nitro Server
    participant H as API Handler

    B->>V: HTTP Request
    V->>N: Forward to SSR
    N->>H: Route to handler
    H->>H: Execute server function
    H-->>N: Response/Stream
    N-->>V: Forward response
    V-->>B: HTTP Response
```

## 11 Asset Categories

```mermaid
mindmap
    root((Asset Categories))
        Liquid
            Liquidity
            Stocks
            Bonds
            Commodities
            Crypto
        Illiquid
            Real Estate
            Art & Collectibles
            Private Equity
            Direct Holdings
            Alternative Energy
            Agriculture
```

## Technology Stack

```mermaid
graph TB
    subgraph Frontend
        React[React 19]
        TanStack[TanStack Start/Router/Query]
        Tailwind[Tailwind CSS 4]
        Shadcn[shadcn/ui]
        Recharts[Recharts]
    end

    subgraph Backend
        FastAPI[FastAPI]
        Python[Python 3.13]
        Pydantic[Pydantic]
        CurlCffi[curl_cffi]
    end

    subgraph AI
        VercelAI[Vercel AI SDK]
        OpenAI[OpenAI GPT-4o]
        Zod[Zod Schemas]
    end

    subgraph Data
        SQLite[SQLite]
        Drizzle[Drizzle ORM]
        JSON[JSON Config]
    end

    subgraph Infra
        Docker[Docker]
        Vite[Vite]
        Bun[Bun]
    end
```
