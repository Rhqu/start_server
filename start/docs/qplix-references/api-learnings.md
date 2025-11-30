# Qplix API Learnings

## Authentication

```
POST https://smd43.qplix.com/Token
Headers:
  Content-Type: application/x-www-form-urlencoded
  Authorization: Bearer {F5_BEARER}
Body: grant_type=password&username={user}&password={pass}

Response: { access_token: "..." }
```

All subsequent requests need dual bearer:
```
Authorization: Bearer {F5_BEARER}, Bearer {access_token}
```

## Key IDs

| Entity | ID |
|--------|-----|
| Legal Entity | `5cb71a8b2c94de98b02aff19` |
| Performance Preset | `691dd7473022610895c23ad9` |
| Time Series Classification | `691dd5953022610895c1aeff` |
| Time Series Security | `691dd48d3022610895c102ea` |

## Presets Comparison

### Performance Preset (`691dd7473022610895c23ad9`)
- Returns **point-in-time** values (not timeseries)
- Use `DueDate` param to get snapshot at specific date
- Fast, good for building historical data with multiple calls

| Index | Header | Type | Description |
|-------|--------|------|-------------|
| 0 | TWR | Percentage | Time-weighted return (e.g., 0.008 = 0.8%) |
| 1 | IRR | Percentage | Internal rate of return |
| 2 | External Flow | Money | Net cash flows (0 if none) |
| 3 | Total Performance | Money | Cumulative profit/loss in € |

### Time Series Security Preset (`691dd48d3022610895c102ea`)
- Returns **timeseries** data (date-keyed objects)
- Use `StartDate`, `DueDate`, `Interval` params
- **Warning**: Only returns ~1 month of data regardless of StartDate
- 95 children = individual securities

| Index | Header | Type | Description |
|-------|--------|------|-------------|
| 0 | TWR | PercentageTimeSeries | Daily returns |
| 1 | External Flow Change | MoneyTimeSeries | Cash flow changes |
| 2 | IRR | PercentageTimeSeries | Daily IRR |
| 3 | ITD NAV | MoneyTimeSeries | **Portfolio value** (~€160M) |
| 4 | Asset Quota | PercentageTimeSeries | Allocation % |
| 5 | Period P&L | MoneyTimeSeries | Daily profit/loss |

### Time Series Classification Preset (`691dd5953022610895c1aeff`)
- Groups by asset class instead of security
- **Very slow** - can timeout
- Not recommended

## API Endpoints

### Get Evaluation
```
GET /qapi/v1/evaluation/preset/{presetId}/legalEntity/{legalEntityId}
```

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| DueDate | YYYY-MM-DD | Evaluation date (default: today) |
| StartDate | YYYY-MM-DD | Period start (timeseries only) |
| Interval | string | Daily, Weekly, Monthly, Quarterly, Yearly |

## Response Structure

```typescript
{
  headers: string[],           // Column names
  subHeaders: string[][],      // Sub-column names
  resultLine: {
    name: string,              // "All investments of Family Smith"
    values: [{
      type: string,            // "Money", "Percentage", "MoneyTimeSeries", etc.
      rawValue: number | Record<string, number>,
      value: string,           // Formatted display value
    }],
    subLines: [...]            // Children (securities or asset classes)
  }
}
```

## Timeseries rawValue Format

```typescript
// Point-in-time (Performance preset)
rawValue: 1699609.5

// Timeseries (Security preset)
rawValue: {
  "2024-03-01T22:59:59.999Z": 159751933.03,
  "2024-03-02T22:59:59.999Z": 159748623,
  ...
}
```

**Note**: Dates have timezone artifacts. Normalize to `YYYY-MM-DD` by splitting on "T".

## Best Practices

### For Historical Portfolio Value
Use Performance preset with multiple DueDate calls:
```typescript
// Monthly snapshots - 12 parallel calls
const dates = ["2024-01-31", "2024-02-29", ...]
const results = await Promise.all(dates.map(d =>
  fetch(`/evaluation/preset/${PERF}/legalEntity/${LE}?DueDate=${d}`)
))
```

### For Recent Daily Data
Use Time Series Security preset:
```typescript
fetch(`/evaluation/preset/${TS_SEC}/legalEntity/${LE}?StartDate=2024-12-01&DueDate=2024-12-31&Interval=Daily`)
// Returns ITD NAV at index 3
```

### For Asset Breakdown
Performance preset includes `subLines` with:
- Liquid assets
  - Liquidity, Stocks, Bonds, Commodities, Alternative investments
- Illiquid assets
  - Real estate, Art/collectibles, Private equity, Direct holdings, etc.

## Known Limitations

1. **Time Series Classification preset is extremely slow** (>1 min)
2. **Time Series presets ignore StartDate** - only return ~1 month of recent data
3. **Duplicate timestamps** in timeseries data - dedupe by date
4. **TWR values are tiny decimals** (0.008 = 0.8%), not percentages

## Portfolio Structure

```
All investments of Family Smith (~€160M)
├── Liquid assets
│   ├── Liquidity
│   ├── Stocks (Options, Futures, Individual, Funds)
│   ├── Bonds
│   ├── Commodities
│   └── Alternative investments (Crypto)
└── Illiquid assets
    ├── Real estate (Holdings, Rental)
    ├── Art and collectibles (Vehicles, Jewelry, Art)
    ├── Private equity (Venture, Growth/Buyout)
    ├── Direct holdings
    ├── Agriculture/forestry
    └── Alternative energies (Solar, Wind)
```

## Sample Values (Dec 2024)

| Metric | Value |
|--------|-------|
| Portfolio NAV | €167.5M |
| Total Performance (profit) | €30.2M |
| TWR | 0.82% |
| Securities count | 95 |

---

## Final Implementation: `getPortfolioCategoryTimeseries`

### Usage

```typescript
import { getPortfolioCategoryTimeseries } from '~/lib/qplix'

const data = await getPortfolioCategoryTimeseries({
  data: {
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    interval: "monthly" // "daily" | "weekly" | "monthly"
  }
})
```

### API Route

```
GET /api/portfolio-categories?startDate=2024-01-01&endDate=2024-12-31&interval=monthly
```

### Response Type

```typescript
type PortfolioTimeSeries = {
  name: string;                    // "All investments of Family Smith"
  startDate: string;
  endDate: string;
  interval: "daily" | "weekly" | "monthly";
  categoryNames: string[];         // All category names found
  data: CategoryDataPoint[];
}

type CategoryDataPoint = {
  date: string;                    // "2024-01-31"
  total: number;                   // Total performance (profit) in €
  twr: number;                     // Time-weighted return (0.008 = 0.8%)
  categories: Record<string, {
    value: number;                 // Category performance in €
    twr: number;                   // Category TWR
  }>;
}
```

### Categories Returned

**Top-level:**
- Liquid assets
- Illiquid assets

**Second-level:**
- Liquidity
- Stocks
- Bonds
- Commodities
- Alternative investments
- Real estate
- Art and collectibles
- Private equity
- Direct holdings
- Agriculture and forestry
- Alternative energies

### Performance Characteristics

| Interval | Points/Year | API Calls | ~Time |
|----------|-------------|-----------|-------|
| monthly  | 12          | 12        | 2-3s  |
| weekly   | 52          | 52        | 8-12s |
| daily    | 365         | 365       | 30-60s |

### Example Response

```json
{
  "name": "All investments of Family Smith",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "interval": "monthly",
  "categoryNames": ["Stocks", "Bonds", "Real estate", ...],
  "data": [
    {
      "date": "2024-01-31",
      "total": 21053683.34,
      "twr": 0.00614,
      "categories": {
        "Liquid assets": { "value": 9995053.58, "twr": 0.00512 },
        "Stocks": { "value": 9843718.31, "twr": 0.12933 },
        "Bonds": { "value": -799873.16, "twr": -0.00603 },
        "Real estate": { "value": 6505777.15, "twr": 0.01210 },
        ...
      }
    },
    ...
  ]
}
```

### Notes

- Values are **cumulative profit/loss**, not NAV
- Negative values mean loss (e.g., Bonds: -€799K)
- TWR is decimal (0.12933 = 12.9% return)
- Uses Performance preset with parallel DueDate fetches
- Batches 10 concurrent API calls for efficiency
