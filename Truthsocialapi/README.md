# Truth Social Investment API

A FastAPI-based backend service that fetches investment-related posts from Truth Social for market sentiment analysis. Integrates with the QPLIX dashboard frontend.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Truthbrush Library](#truthbrush-library)
- [Available Sectors](#available-sectors)
- [Deployment](#deployment)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)

---

## Overview

This API provides endpoints to fetch and filter Truth Social posts by investment sector. It powers the market sentiment analysis feature in the QPLIX dashboard by:

1. Fetching posts from government officials (Trump, White House, Press Secretary)
2. Filtering posts by investment sector keywords
3. Ranking posts by engagement metrics
4. Providing structured data for GPT-4o sentiment analysis

---

## Architecture

```
Truthsocialapi/
├── server.py                    # FastAPI server (main entry point)
├── requirements.txt             # Python dependencies
├── Dockerfile                   # Docker containerization
├── docker-compose.yml           # Docker Compose configuration
├── .env                         # Environment variables
└── truthbrush/                  # Truth Social client library
    └── truthbrush/
        ├── __init__.py          # Package exports
        ├── api.py               # Low-level API client
        ├── investment_client.py # High-level investment wrapper
        └── cli.py               # Command-line interface
```

---

## Installation

### Prerequisites

- Python 3.11+
- pip or pipenv

### Local Setup

```bash
cd Truthsocialapi

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install truthbrush library
pip install -e ./truthbrush

# Create environment file
cp .env.example .env  # Edit with your credentials
```

### Dependencies

```
fastapi>=0.104.0        # Web framework
uvicorn>=0.24.0         # ASGI server
pydantic>=2.0.0         # Data validation
python-dotenv>=1.0.1    # Environment variables
click>=8.1.0            # CLI framework
loguru>=0.7.0           # Logging
python-dateutil>=2.9.0  # Date parsing
curl_cffi>=0.13.0       # HTTP client (Cloudflare bypass)
```

---

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Option 1: Username/Password authentication (recommended)
TRUTHSOCIAL_USERNAME=your_username
TRUTHSOCIAL_PASSWORD=your_password

# Option 2: Direct token (if you have a pre-existing token)
TRUTHSOCIAL_TOKEN=your_access_token
```

| Variable | Required | Description |
|----------|----------|-------------|
| `TRUTHSOCIAL_USERNAME` | Yes* | Truth Social account username |
| `TRUTHSOCIAL_PASSWORD` | Yes* | Truth Social account password |
| `TRUTHSOCIAL_TOKEN` | No | Pre-existing OAuth access token |

*Required unless `TRUTHSOCIAL_TOKEN` is provided.

### Authentication Flow

1. Server reads credentials from environment variables
2. On first API request, `InvestmentClient` initializes
3. OAuth login to `https://truthsocial.com/oauth/token`
4. Access token cached for subsequent requests
5. Bearer token included in all API requests

---

## API Reference

**Base URL:** `http://localhost:8000`

### Health Check

```http
GET /
```

**Response:**
```json
{
  "message": "Truth Social Investment API",
  "status": "running"
}
```

---

### List All Sectors

```http
GET /sectors
```

**Response:**
```json
{
  "sectors": [
    "liquidity",
    "stocks",
    "bonds",
    "commodities",
    "crypto",
    "real-estate",
    "art-collectibles",
    "private-equity",
    "direct-holdings",
    "alternative-energy",
    "agriculture"
  ]
}
```

---

### Get Sector Information

```http
GET /sectors/{sector}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| sector | path | Yes | Sector key (e.g., "stocks") |

**Response:**
```json
{
  "name": "Stocks",
  "hashtags": ["stocks", "stockmarket", "nasdaq", "DowJones", "SP500"],
  "description": "Investment sector for Stocks"
}
```

**Error (404):**
```json
{
  "detail": "Sector 'invalid' not found"
}
```

---

### Get Trending Posts (Government Officials)

```http
GET /sectors/{sector}/trending?limit=10
```

Fetches posts from government accounts filtered by sector keywords.

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| sector | path | Yes | - | Sector key |
| limit | query | No | 10 | Maximum posts to return |

**Sources:** `realDonaldTrump`, `WhiteHouse`, `PressSec`

**Response:**
```json
{
  "sector": "stocks",
  "hashtags": ["stocks", "stockmarket", "nasdaq"],
  "sources": ["realDonaldTrump", "WhiteHouse", "PressSec"],
  "posts": [
    {
      "url": "https://truthsocial.com/@realDonaldTrump/posts/123456",
      "content": "The stock market is at an all-time high...",
      "author_handle": "realDonaldTrump",
      "author_display_name": "Donald J. Trump",
      "author_followers": 7500000,
      "engagement": 45000,
      "replies_count": 5000,
      "reblogs_count": 15000,
      "favourites_count": 25000,
      "created_at": "2024-11-30T14:30:00.000Z"
    }
  ]
}
```

**Notes:**
- Searches posts from last 72 hours
- Filters by sector keywords
- Falls back to recent posts if no keyword matches

---

### Get Top Posts by Engagement

```http
GET /sectors/{sector}/posts?top_n=10
```

Fetches posts by hashtag and ranks by engagement score.

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| sector | path | Yes | - | Sector key |
| top_n | query | No | 10 | Number of top posts |

**Response:** Same format as trending endpoint.

**Notes:**
- Queries sector hashtags directly
- More rate-limit friendly than keyword search
- Sorted by engagement (replies + reblogs + favorites)

---

## Truthbrush Library

The `truthbrush` package provides low-level and high-level clients for Truth Social.

### Api Class (Low-level)

Direct API access with authentication and rate limiting.

```python
from truthbrush import Api

api = Api()
api.get_auth_id("username", "password")

# Search posts
for page in api.search("statuses", "bitcoin", limit=100):
    for post in page:
        print(post["content"])

# Get hashtag posts
for batch in api.hashtag("stocks", limit=50):
    for post in batch:
        print(post["url"])

# Get user posts
for post in api.pull_statuses("realDonaldTrump", created_after=datetime.now() - timedelta(days=7)):
    print(post["content"])
```

**Key Methods:**

| Method | Description |
|--------|-------------|
| `get_auth_id(username, password)` | OAuth login, returns token |
| `search(type, query, limit)` | Search posts/accounts/hashtags |
| `hashtag(tag, limit)` | Get posts with hashtag |
| `pull_statuses(username, ...)` | Get user's posts |
| `trending(limit)` | Get trending posts |
| `lookup(handle)` | Get user info |
| `user_followers(handle, ...)` | Get user's followers |

### InvestmentClient Class (High-level)

Sector-focused queries for investment analysis.

```python
from truthbrush import InvestmentClient

client = InvestmentClient(username="user", password="pass")

# List available sectors
sectors = client.list_sectors()

# Get sector info
info = client.get_sector_info("stocks")
print(info.hashtags)  # ['stocks', 'nasdaq', 'DowJones', ...]

# Get government posts for sector
result = client.get_government_posts_for_sector("crypto", limit=10)
for post in result["posts"]:
    print(f"{post.author_handle}: {post.content[:100]}...")

# Get posts by hashtag
posts = client.get_sector_posts_by_hashtag("stocks", top_n=20)
for post in posts:
    print(f"Engagement: {post.engagement} - {post.url}")
```

**Key Methods:**

| Method | Description |
|--------|-------------|
| `list_sectors()` | Get all sector keys |
| `get_sector_info(sector)` | Get sector details |
| `get_government_posts_for_sector(sector, limit, hours_back)` | Government official posts |
| `get_sector_posts_by_hashtag(sector, limit, top_n)` | Posts from sector hashtags |
| `get_sector_trending(sector, limit)` | Trending posts for sector |
| `custom_query(query, limit)` | Custom search sorted by engagement |

### Data Models

```python
@dataclass
class Post:
    id: str
    content: str
    created_at: str
    url: str
    author_handle: str
    author_display_name: str
    author_followers: int
    author_verified: bool
    replies_count: int
    reblogs_count: int
    favourites_count: int

    @property
    def engagement(self) -> int:
        return self.replies_count + self.reblogs_count + self.favourites_count
```

---

## Available Sectors

| Key | Name | Sample Hashtags |
|-----|------|-----------------|
| `liquidity` | Liquidity | FederalReserve, ECB, monetarypolicy |
| `stocks` | Stocks | stocks, nasdaq, DowJones, SP500 |
| `bonds` | Bonds | bonds, treasury, fixedincome, yields |
| `commodities` | Commodities | gold, silver, oil, metals |
| `crypto` | Crypto currencies | bitcoin, ethereum, crypto, blockchain |
| `real-estate` | Real estate | realestate, property, housing, REIT |
| `art-collectibles` | Art and collectibles | art, collectibles, auction, luxury |
| `private-equity` | Private equity | privateequity, venturecapital, startup |
| `direct-holdings` | Direct holdings | investment, equity, capital |
| `alternative-energy` | Alternative energies | solar, renewable, cleanenergy |
| `agriculture` | Agriculture | agriculture, farming, agribusiness |

---

## Deployment

### Local Development

```bash
# Activate virtual environment
source venv/bin/activate

# Start server
python server.py
```

Server runs at `http://localhost:8000`

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Docker Compose Configuration

```yaml
services:
  truthsocial-api:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    restart: unless-stopped
```

### Production Considerations

1. **CORS Configuration**: Currently allows all origins. Restrict in production:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://your-domain.com"],
       ...
   )
   ```

2. **HTTPS**: Deploy behind a reverse proxy (nginx, Caddy) with TLS

3. **Rate Limiting**: Add API rate limiting for your own endpoints

4. **Monitoring**: Add health check endpoints and logging aggregation

---

## Rate Limiting

The API implements multiple safeguards against Truth Social rate limits:

### Built-in Protections

1. **Automatic sleep**: When remaining requests ≤ 50, waits until reset
2. **Configurable delays**: 0.5s delay between hashtag queries
3. **Pagination limits**: Max 40 posts per hashtag query
4. **Government posts**: Max 50 posts per account fetch

### Rate Limit Headers

The client tracks these headers from Truth Social:
- `x-ratelimit-limit`: Maximum requests allowed
- `x-ratelimit-remaining`: Requests remaining
- `x-ratelimit-reset`: Unix timestamp when limit resets

### Best Practices

- Use `/sectors/{sector}/posts` over `/trending` for less API calls
- Cache responses when possible
- Implement exponential backoff on 429 errors

---

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Missing/invalid credentials |
| 404 | Sector not found |
| 429 | Rate limited |
| 500 | Internal server error |

### Exception Types

```python
from truthbrush.api import (
    LoginErrorException,    # Authentication failed
    GeoblockException,      # Geographic restriction
    CFBlockException,       # Cloudflare block
    RateLimitException,     # Rate limited
)
```

### Common Issues

**"Login failed"**
- Verify username/password in `.env`
- Check account is not locked/banned

**"Geographic restriction"**
- Truth Social may block certain regions
- Use VPN to US-based server

**"Cloudflare block"**
- Wait and retry
- The client uses `curl_cffi` to bypass most blocks

**"Rate limited"**
- Wait for reset time
- Reduce request frequency

---

## Integration with Frontend

The frontend dashboard integrates via the `/api/outlook` endpoint:

```
Frontend Request:
POST /api/outlook { sector: "stocks" }
    ↓
Frontend Server:
GET http://localhost:8000/sectors/stocks/trending
    ↓
Truth Social API:
Fetch posts → Filter by keywords → Sort by engagement
    ↓
Frontend Server:
Send to GPT-4o for sentiment analysis
    ↓
Frontend:
Display sentiment dashboard
```

---

## License

Private - Internal use only.
