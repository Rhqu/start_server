# QPLIX API Integration Guide

## Overview

This guide describes how to integrate with the QPLIX Wealth Management API to build a financial dashboard application. The API provides access to portfolio data, timeseries metrics, and wealth analytics for a single client (Legal Entity).

---

## Table of Contents

1. [Domain Concepts](#1-domain-concepts)
2. [Authentication](#2-authentication)
3. [API Endpoints Reference](#3-api-endpoints-reference)
4. [Data Models](#4-data-models)
5. [TypeScript Client Implementation](#5-typescript-client-implementation)
6. [Usage Examples](#6-usage-examples)
7. [Error Handling](#7-error-handling)

---

## 1. Domain Concepts

### 1.1 Hierarchy Overview

```
Legal Entity (Client)
├── Custodians (Banks/Brokers holding assets)
│   └── Investments (Positions)
│       └── Securities (Assets)
├── Virtual Entities (Logical portfolio buckets)
└── Benchmarks (Performance comparisons)
```

### 1.2 Key Terms

| Term | Description | Example |
|------|-------------|---------|
| **Legal Entity** | The client/owner of wealth. Single entity in our context. | "Müller Family Office" |
| **Custodian** | Financial institution holding assets physically. | UBS Zurich, Deutsche Bank |
| **Virtual Entity** | Logical grouping/view of assets for different purposes. | "Retirement Fund", "Kids Education" |
| **Benchmark** | Reference index for performance comparison. | S&P 500, MSCI World |
| **Security** | Individual financial instrument. | Apple Stock (AAPL), German Bund |
| **Investment** | A position/holding of a security in the portfolio. | "100 shares of AAPL" |
| **Preset** | Predefined report template defining what metrics to return. | "Wealth Overview", "Risk Analysis" |
| **Classification** | Asset categorization hierarchy. | Equities → US Equities → Tech |

### 1.3 Timeseries Data

The API returns timeseries data in hierarchical structures. Value types include:

**Simple Types:**
- `Amount` - Numeric quantity
- `Money` - Currency value with amount
- `Percentage` - Decimal percentage (0.05 = 5%)
- `Ratio` - Numeric ratio
- `Text` - String value
- `Date` - Date value
- `Boolean` - True/false

**Timeseries Types (Dictionary with date keys):**
- `AmountTimeSeries` - `{ "2024-01-01": 100, "2024-02-01": 105 }`
- `MoneyTimeSeries` - `{ "2024-01-01": 50000.00, "2024-02-01": 51250.00 }`
- `PercentageTimeSeries` - `{ "2024-01-01": 0.05, "2024-02-01": 0.052 }`
- `RatioTimeSeries` - `{ "2024-01-01": 1.5, "2024-02-01": 1.48 }`

**Complex Types:**
- `Classification` - Asset class categorization
- `MoneyExposure` - Exposure breakdown
- `WeightedEnum` - Weighted categorical values
- `Period` - Time period definition

---

## 2. Authentication

### 2.1 Dual Token System

The API uses a two-layer authentication:

1. **F5 Bearer Token** - Infrastructure-level token (provided by QPLIX)
2. **Q Bearer Token** - User-specific token obtained via OAuth2

### 2.2 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Use F5 Bearer Token to access token endpoint            │
│ Step 2: POST credentials to get Q Bearer Token                  │
│ Step 3: Combine both tokens for API requests                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Token Request

**Endpoint:** `POST /oauth/token`

**Headers:**
```
Authorization: Bearer {F5_BEARER_TOKEN}
Content-Type: application/x-www-form-urlencoded
```

**Body:**
```
grant_type=password&username={USERNAME}&password={PASSWORD}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 2.4 Authenticated API Request

**Headers for all subsequent requests:**
```
Authorization: Bearer {F5_BEARER_TOKEN}, {Q_BEARER_TOKEN}
Content-Type: application/json
```

---

## 3. API Endpoints Reference

### 3.1 Base URL

```
https://{environment}.qplix.cloud
```

Environments: `smd43` or `smd44` (provided by QPLIX)

### 3.2 Discovery Endpoints

#### Get Legal Entity Details
```
GET /qapi/v1/legalEntities/{legalEntityId}
```
Returns: Full client information including properties and settings.

#### Get Custodians
```
GET /qapi/v1/legalEntities/{legalEntityId}/custodians
```
Returns: Array of custodians (banks/brokers) holding assets.

#### Get Virtual Entities
```
GET /qapi/v1/legalEntities/{legalEntityId}/virtualEntities
```
Returns: Array of logical portfolio groupings.

#### Get Benchmarks
```
GET /qapi/v1/legalEntities/{legalEntityId}/benchmarks
```
Returns: Array of assigned performance benchmarks.

#### Get Available Presets
```
GET /qapi/v1/presets
```
Returns: Paginated list of report templates.

#### Get Preset Details
```
GET /qapi/v1/presets/{presetId}
```
Returns: Full preset configuration with column definitions.

#### Get Classifications Root
```
GET /qapi/v1/classifications/root
```
Returns: Top-level asset classification.

#### Get Sub-Classifications
```
GET /qapi/v1/classifications/{classificationId}/subClassifications
```
Returns: Child classifications for drill-down.

### 3.3 Core Data Endpoints

#### Get Evaluation Results (PRIMARY ENDPOINT)
```
GET /qapi/v1/evaluation/preset/{presetId}/legalEntity/{legalEntityId}
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `DueDate` | string (date) | Evaluation date. Format: `YYYY-MM-DD`. Default: today |
| `StartDate` | string (date) | Period start date. Format: `YYYY-MM-DD` |
| `Interval` | string | Granularity: `Daily`, `Weekly`, `Monthly`, `Quarterly`, `Yearly` |
| `GroupId` | string | Optional group context |
| `RespectHide` | boolean | Respect hidden flags |
| `EntryType` | string | Entry type filter |
| `AnalyticStartProviderId` | string | Analytics start date source |

**Returns:** `QueryResultMatrix` with hierarchical timeseries data.

#### Get Legal Entity Query Results (Alternative)
```
GET /qapi/v1/legalEntities/{legalEntityId}/queryResults/{presetId}
```
Same parameters as above. Alternative path to same data.

#### Get Security Query Results
```
GET /qapi/v1/securities/{securityId}/queryResults/{presetId}
```
Returns: Query results for a specific security.

#### Get Investment Query Results
```
GET /qapi/v1/investments/{investmentId}/queryResults/{presetId}
```
Returns: Query results for a specific investment position.

### 3.4 Security & Investment Endpoints

#### List Securities
```
GET /qapi/v1/securities
```

**Query Parameters:**
- `Search` - Search string for name
- `DueDate` - Validity date
- `Tags` - Filter by tags
- `ClassificationIds` - Filter by classifications
- `Skip` / `Limit` - Pagination

#### Get Security Details
```
GET /qapi/v1/securities/{securityId}
```

#### List Investments
```
GET /qapi/v1/investments
```

#### Get Investment Details
```
GET /qapi/v1/investments/{investmentId}
```

### 3.5 Benchmark Endpoints

#### List All Benchmarks
```
GET /qapi/v1/benchmarks
```

#### Get Benchmark Details
```
GET /qapi/v1/benchmarks/{benchmarkId}
```

### 3.6 Activity Endpoints

#### Get Activities
```
GET /qapi/v1/activities
```

**Query Parameters:**
- `From` - Start date filter
- `Until` - End date filter
- `BusinessObjectType` - Filter by type
- `BusinessObjectId` - Filter by specific object
- `Labels` - Filter by activity labels

---

## 4. Data Models

### 4.1 QueryResultMatrix (Main Response Structure)

```typescript
interface QueryResultMatrix {
  /** Column headers for the result table */
  headers: string[];
  
  /** Sub-headers (second level column names) */
  subHeaders: string[][];
  
  /** Headers for visualization columns */
  visualizationHeaders: string[];
  
  /** The root result line containing all data */
  resultLine: QueryResultLine;
}
```

### 4.2 QueryResultLine (Hierarchical Row)

```typescript
interface QueryResultLine {
  /** Display name of this row (e.g., "Total Portfolio", "Equities", "Apple Inc") */
  name: string;
  
  /** Array of values corresponding to each header column */
  values: QueryResultValue[];
  
  /** Child rows for drill-down (recursive structure) */
  subLines: QueryResultLine[];
  
  /** Visualization-specific values */
  visualizations: QueryResultValue[];
}
```

### 4.3 QueryResultValue (Cell Value)

```typescript
interface QueryResultValue {
  /** The data type of this value */
  type: ResultValueType;
  
  /** Raw value - can be number, string, boolean, or timeseries object */
  rawValue: unknown;
  
  /** Formatted display value */
  value: string;
  
  /** Sub-values for complex types */
  subValues: QueryResultValue[];
}

type ResultValueType =
  // Simple types
  | 'Amount'
  | 'Money'
  | 'Percentage'
  | 'Ratio'
  | 'Text'
  | 'Date'
  | 'Boolean'
  // Timeseries types
  | 'AmountTimeSeries'
  | 'MoneyTimeSeries'
  | 'PercentageTimeSeries'
  | 'RatioTimeSeries'
  // Complex types
  | 'Classification'
  | 'MoneyExposure'
  | 'WeightedEnum'
  | 'Period';
```

### 4.4 Timeseries Data Structure

```typescript
/** Timeseries are represented as date-keyed objects */
type TimeSeriesData = Record<string, number>;

// Example:
const moneyTimeSeries: TimeSeriesData = {
  "2024-01-01": 1000000.00,
  "2024-02-01": 1025000.00,
  "2024-03-01": 1018000.00,
  "2024-04-01": 1052000.00
};
```

### 4.5 Entity Models

```typescript
interface LegalEntity {
  id: string;
  name: string;
  type: string;
  properties: PropertyValue[];
  // ... additional fields
}

interface Custodian {
  id: string;
  name: string;
  // ... additional fields
}

interface VirtualEntity {
  id: string;
  name: string;
  // ... additional fields
}

interface Benchmark {
  id: string;
  name: string;
  // ... additional fields
}

interface Preset {
  id: string;
  name: string;
  description?: string;
  // ... additional fields
}

interface Security {
  id: string;
  name: string;
  isin?: string;
  ticker?: string;
  type: string;
  // ... additional fields
}

interface Investment {
  id: string;
  securityId: string;
  quantity: number;
  // ... additional fields
}
```

### 4.6 Paginated Response

```typescript
interface Pageable<T> {
  items: T[];
  totalCount: number;
  skip: number;
  limit: number;
}
```

---

## 5. TypeScript Client Implementation

### 5.1 Project Structure

```
src/
├── api/
│   ├── client.ts           # Main API client class
│   ├── auth.ts             # Authentication logic
│   ├── endpoints/
│   │   ├── evaluation.ts   # Evaluation endpoints
│   │   ├── legalEntity.ts  # Legal entity endpoints
│   │   ├── securities.ts   # Securities endpoints
│   │   ├── benchmarks.ts   # Benchmarks endpoints
│   │   └── presets.ts      # Presets endpoints
│   └── types/
│       ├── index.ts        # Export all types
│       ├── common.ts       # Common types
│       ├── query.ts        # Query result types
│       ├── entities.ts     # Entity types
│       └── timeseries.ts   # Timeseries types
├── utils/
│   ├── timeseries.ts       # Timeseries parsing utilities
│   └── tree.ts             # Tree traversal utilities
└── index.ts                # Main export
```

### 5.2 Types Definition

Create `src/api/types/common.ts`:

```typescript
// ============================================================================
// Common Types
// ============================================================================

export interface ApiConfig {
  baseUrl: string;
  f5BearerToken: string;
  username: string;
  password: string;
}

export interface AuthTokens {
  f5Token: string;
  qToken: string;
  expiresAt: Date;
}

export interface Pageable<T> {
  items: T[];
  totalCount: number;
  skip: number;
  limit: number;
}

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}
```

Create `src/api/types/timeseries.ts`:

```typescript
// ============================================================================
// Timeseries Types
// ============================================================================

/** Date string in ISO format (YYYY-MM-DD) */
export type DateString = string;

/** Timeseries data as date-keyed record */
export type TimeSeriesData = Record<DateString, number>;

/** Supported interval types */
export type Interval = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';

/** Value type enumeration */
export type ResultValueType =
  | 'Amount'
  | 'Money'
  | 'Percentage'
  | 'Ratio'
  | 'Text'
  | 'Date'
  | 'Boolean'
  | 'AmountTimeSeries'
  | 'MoneyTimeSeries'
  | 'PercentageTimeSeries'
  | 'RatioTimeSeries'
  | 'Classification'
  | 'MoneyExposure'
  | 'WeightedEnum'
  | 'Period';

/** Check if type is a timeseries type */
export function isTimeSeriesType(type: ResultValueType): boolean {
  return [
    'AmountTimeSeries',
    'MoneyTimeSeries',
    'PercentageTimeSeries',
    'RatioTimeSeries'
  ].includes(type);
}
```

Create `src/api/types/query.ts`:

```typescript
// ============================================================================
// Query Result Types
// ============================================================================

import { ResultValueType, TimeSeriesData } from './timeseries';

/** Single cell value in the result matrix */
export interface QueryResultValue {
  /** Data type of this value */
  type: ResultValueType;
  
  /** 
   * Raw value - type depends on `type` field:
   * - Simple types: number | string | boolean
   * - Timeseries types: Record<string, number>
   * - Complex types: object
   */
  rawValue: unknown;
  
  /** Formatted string representation */
  value: string;
  
  /** Nested values for complex types */
  subValues: QueryResultValue[];
}

/** Single row in the result tree */
export interface QueryResultLine {
  /** Display name (e.g., "Total Portfolio", "Equities", "Apple Inc") */
  name: string;
  
  /** Values array - index corresponds to headers array */
  values: QueryResultValue[];
  
  /** Child rows for hierarchical drill-down */
  subLines: QueryResultLine[];
  
  /** Visualization-specific values */
  visualizations: QueryResultValue[];
}

/** Top-level result structure */
export interface QueryResultMatrix {
  /** Column headers */
  headers: string[];
  
  /** Second-level headers (array per column) */
  subHeaders: string[][];
  
  /** Visualization column headers */
  visualizationHeaders: string[];
  
  /** Root result line containing all data */
  resultLine: QueryResultLine;
}

/** Parameters for evaluation query */
export interface EvaluationQueryParams {
  /** Evaluation date (YYYY-MM-DD). Default: today */
  dueDate?: string;
  
  /** Period start date (YYYY-MM-DD) */
  startDate?: string;
  
  /** Data interval/granularity */
  interval?: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  
  /** Optional group context ID */
  groupId?: string;
  
  /** Respect hidden flags */
  respectHide?: boolean;
  
  /** Entry type filter */
  entryType?: string;
  
  /** Analytics start date provider ID */
  analyticStartProviderId?: string;
}
```

Create `src/api/types/entities.ts`:

```typescript
// ============================================================================
// Entity Types
// ============================================================================

export interface LegalEntity {
  id: string;
  name: string;
  type?: string;
  externalId?: string;
  properties?: PropertyValue[];
}

export interface PropertyValue {
  id: string;
  name: string;
  value: unknown;
  validFrom?: string;
  validTo?: string;
}

export interface Custodian {
  id: string;
  name: string;
  externalId?: string;
}

export interface VirtualEntity {
  id: string;
  name: string;
  description?: string;
}

export interface Benchmark {
  id: string;
  name: string;
  description?: string;
}

export interface Preset {
  id: string;
  name: string;
  description?: string;
}

export interface Security {
  id: string;
  name: string;
  isin?: string;
  ticker?: string;
  wkn?: string;
  type?: string;
  currency?: string;
}

export interface Investment {
  id: string;
  securityId: string;
  custodianId?: string;
  quantity?: number;
  marketValue?: number;
}

export interface Classification {
  id: string;
  name: string;
  level: number;
  parentId?: string;
}

export interface Activity {
  id: string;
  type: string;
  timestamp: string;
  description?: string;
  businessObjectId?: string;
  businessObjectType?: string;
}
```

Create `src/api/types/index.ts`:

```typescript
// ============================================================================
// Types Index - Export All Types
// ============================================================================

export * from './common';
export * from './timeseries';
export * from './query';
export * from './entities';
```

### 5.3 Authentication Module

Create `src/api/auth.ts`:

```typescript
// ============================================================================
// Authentication Module
// ============================================================================

import { ApiConfig, AuthTokens } from './types';

/**
 * Authenticates with the QPLIX API using the dual-token system.
 * 
 * Flow:
 * 1. Use F5 bearer token to access the OAuth endpoint
 * 2. Exchange username/password for Q bearer token
 * 3. Return combined tokens for API requests
 */
export async function authenticate(config: ApiConfig): Promise<AuthTokens> {
  const tokenUrl = `${config.baseUrl}/oauth/token`;
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.f5BearerToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username: config.username,
      password: config.password,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Calculate expiration time (subtract 60 seconds for safety margin)
  const expiresIn = data.expires_in || 3600;
  const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000);

  return {
    f5Token: config.f5BearerToken,
    qToken: data.access_token,
    expiresAt,
  };
}

/**
 * Checks if tokens are still valid (not expired).
 */
export function isTokenValid(tokens: AuthTokens): boolean {
  return tokens.expiresAt > new Date();
}

/**
 * Creates the Authorization header value for API requests.
 */
export function getAuthHeader(tokens: AuthTokens): string {
  return `Bearer ${tokens.f5Token}, ${tokens.qToken}`;
}
```

### 5.4 Main API Client

Create `src/api/client.ts`:

```typescript
// ============================================================================
// QPLIX API Client
// ============================================================================

import { authenticate, isTokenValid, getAuthHeader } from './auth';
import {
  ApiConfig,
  AuthTokens,
  Pageable,
  QueryResultMatrix,
  EvaluationQueryParams,
  LegalEntity,
  Custodian,
  VirtualEntity,
  Benchmark,
  Preset,
  Security,
  Investment,
  Classification,
  Activity,
} from './types';

export class QplixClient {
  private config: ApiConfig;
  private tokens: AuthTokens | null = null;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  // ==========================================================================
  // Authentication
  // ==========================================================================

  /**
   * Ensures we have valid authentication tokens.
   * Automatically refreshes if expired.
   */
  private async ensureAuthenticated(): Promise<AuthTokens> {
    if (!this.tokens || !isTokenValid(this.tokens)) {
      this.tokens = await authenticate(this.config);
    }
    return this.tokens;
  }

  /**
   * Makes an authenticated API request.
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    body?: unknown
  ): Promise<T> {
    const tokens = await this.ensureAuthenticated();
    
    // Build URL with query parameters
    const url = new URL(`${this.config.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Authorization': getAuthHeader(tokens),
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // ==========================================================================
  // Legal Entity Endpoints
  // ==========================================================================

  /**
   * Get legal entity details.
   */
  async getLegalEntity(
    legalEntityId: string,
    includeInheritedProperties = false
  ): Promise<LegalEntity> {
    return this.request('GET', `/qapi/v1/legalEntities/${legalEntityId}`, {
      includeInheritedProperties,
    });
  }

  /**
   * Get custodians for a legal entity.
   */
  async getCustodians(legalEntityId: string): Promise<Custodian[]> {
    return this.request('GET', `/qapi/v1/legalEntities/${legalEntityId}/custodians`);
  }

  /**
   * Get virtual entities for a legal entity.
   */
  async getVirtualEntities(legalEntityId: string): Promise<VirtualEntity[]> {
    return this.request('GET', `/qapi/v1/legalEntities/${legalEntityId}/virtualEntities`);
  }

  /**
   * Get benchmarks assigned to a legal entity.
   */
  async getLegalEntityBenchmarks(legalEntityId: string): Promise<Benchmark[]> {
    return this.request('GET', `/qapi/v1/legalEntities/${legalEntityId}/benchmarks`);
  }

  // ==========================================================================
  // Evaluation Endpoints (Core Data)
  // ==========================================================================

  /**
   * Get evaluation results for a legal entity using a preset.
   * This is the PRIMARY endpoint for fetching wealth/portfolio data.
   */
  async getEvaluation(
    presetId: string,
    legalEntityId: string,
    params: EvaluationQueryParams = {}
  ): Promise<QueryResultMatrix> {
    return this.request(
      'GET',
      `/qapi/v1/evaluation/preset/${presetId}/legalEntity/${legalEntityId}`,
      {
        DueDate: params.dueDate,
        StartDate: params.startDate,
        Interval: params.interval,
        GroupId: params.groupId,
        RespectHide: params.respectHide,
        EntryType: params.entryType,
        AnalyticStartProviderId: params.analyticStartProviderId,
      }
    );
  }

  /**
   * Alternative: Get query results via legal entity path.
   */
  async getLegalEntityQueryResults(
    legalEntityId: string,
    presetId: string,
    params: EvaluationQueryParams = {}
  ): Promise<QueryResultMatrix> {
    return this.request(
      'GET',
      `/qapi/v1/legalEntities/${legalEntityId}/queryResults/${presetId}`,
      {
        DueDate: params.dueDate,
        StartDate: params.startDate,
        Interval: params.interval,
        EntryType: params.entryType,
        AnalyticStartProviderId: params.analyticStartProviderId,
      }
    );
  }

  // ==========================================================================
  // Preset Endpoints
  // ==========================================================================

  /**
   * List available presets.
   */
  async getPresets(skip = 0, limit = 100): Promise<Pageable<Preset>> {
    return this.request('GET', '/qapi/v1/presets', { Skip: skip, Limit: limit });
  }

  /**
   * Get preset details.
   */
  async getPreset(presetId: string): Promise<Preset> {
    return this.request('GET', `/qapi/v1/presets/${presetId}`);
  }

  // ==========================================================================
  // Securities Endpoints
  // ==========================================================================

  /**
   * List securities with optional filters.
   */
  async getSecurities(options: {
    search?: string;
    dueDate?: string;
    tags?: string[];
    classificationIds?: string[];
    skip?: number;
    limit?: number;
  } = {}): Promise<Pageable<Security>> {
    return this.request('GET', '/qapi/v1/securities', {
      Search: options.search,
      DueDate: options.dueDate,
      Skip: options.skip ?? 0,
      Limit: options.limit ?? 100,
    });
  }

  /**
   * Get security details.
   */
  async getSecurity(securityId: string): Promise<Security> {
    return this.request('GET', `/qapi/v1/securities/${securityId}`);
  }

  /**
   * Get query results for a specific security.
   */
  async getSecurityQueryResults(
    securityId: string,
    presetId: string,
    params: EvaluationQueryParams = {}
  ): Promise<QueryResultMatrix> {
    return this.request(
      'GET',
      `/qapi/v1/securities/${securityId}/queryResults/${presetId}`,
      {
        DueDate: params.dueDate,
        StartDate: params.startDate,
        Interval: params.interval,
        EntryType: params.entryType,
        AnalyticStartProviderId: params.analyticStartProviderId,
      }
    );
  }

  // ==========================================================================
  // Investment Endpoints
  // ==========================================================================

  /**
   * List investments with optional filters.
   */
  async getInvestments(options: {
    legalEntityId?: string;
    securityId?: string;
    skip?: number;
    limit?: number;
  } = {}): Promise<Pageable<Investment>> {
    return this.request('GET', '/qapi/v1/investments', {
      LegalEntityId: options.legalEntityId,
      SecurityId: options.securityId,
      Skip: options.skip ?? 0,
      Limit: options.limit ?? 100,
    });
  }

  /**
   * Get investment details.
   */
  async getInvestment(investmentId: string): Promise<Investment> {
    return this.request('GET', `/qapi/v1/investments/${investmentId}`);
  }

  /**
   * Get query results for a specific investment.
   */
  async getInvestmentQueryResults(
    investmentId: string,
    presetId: string,
    params: EvaluationQueryParams = {}
  ): Promise<QueryResultMatrix> {
    return this.request(
      'GET',
      `/qapi/v1/investments/${investmentId}/queryResults/${presetId}`,
      {
        DueDate: params.dueDate,
        StartDate: params.startDate,
        Interval: params.interval,
        EntryType: params.entryType,
        AnalyticStartProviderId: params.analyticStartProviderId,
      }
    );
  }

  // ==========================================================================
  // Benchmark Endpoints
  // ==========================================================================

  /**
   * List all available benchmarks.
   */
  async getBenchmarks(skip = 0, limit = 100): Promise<Pageable<Benchmark>> {
    return this.request('GET', '/qapi/v1/benchmarks', { Skip: skip, Limit: limit });
  }

  /**
   * Get benchmark details.
   */
  async getBenchmark(benchmarkId: string): Promise<Benchmark> {
    return this.request('GET', `/qapi/v1/benchmarks/${benchmarkId}`);
  }

  // ==========================================================================
  // Classification Endpoints
  // ==========================================================================

  /**
   * Get root classification.
   */
  async getClassificationRoot(): Promise<Classification> {
    return this.request('GET', '/qapi/v1/classifications/root');
  }

  /**
   * Get sub-classifications for a parent.
   */
  async getSubClassifications(classificationId: string): Promise<Classification[]> {
    return this.request(
      'GET',
      `/qapi/v1/classifications/${classificationId}/subClassifications`
    );
  }

  // ==========================================================================
  // Activity Endpoints
  // ==========================================================================

  /**
   * Get activities with optional filters.
   */
  async getActivities(options: {
    from?: string;
    until?: string;
    businessObjectType?: string[];
    businessObjectId?: string;
  } = {}): Promise<Activity[]> {
    return this.request('GET', '/qapi/v1/activities', {
      From: options.from,
      Until: options.until,
      BusinessObjectId: options.businessObjectId,
    });
  }
}
```

### 5.5 Utility Functions

Create `src/utils/timeseries.ts`:

```typescript
// ============================================================================
// Timeseries Utility Functions
// ============================================================================

import {
  QueryResultMatrix,
  QueryResultLine,
  QueryResultValue,
  TimeSeriesData,
  ResultValueType,
  isTimeSeriesType,
} from '../api/types';

/**
 * Extracts raw timeseries data from a QueryResultValue.
 * Returns null if the value is not a timeseries type.
 */
export function extractTimeSeries(value: QueryResultValue): TimeSeriesData | null {
  if (!isTimeSeriesType(value.type)) {
    return null;
  }
  
  // The rawValue should be a Record<string, number> for timeseries types
  if (typeof value.rawValue === 'object' && value.rawValue !== null) {
    return value.rawValue as TimeSeriesData;
  }
  
  return null;
}

/**
 * Converts timeseries data to an array of {date, value} objects.
 * Sorted by date ascending.
 */
export function timeSeriestoArray(
  data: TimeSeriesData
): Array<{ date: string; value: number }> {
  return Object.entries(data)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Merges multiple timeseries into a single dataset.
 * Useful for creating multi-line charts.
 */
export function mergeTimeSeries(
  series: Record<string, TimeSeriesData>
): Array<Record<string, number | string>> {
  // Collect all unique dates
  const allDates = new Set<string>();
  Object.values(series).forEach(ts => {
    Object.keys(ts).forEach(date => allDates.add(date));
  });

  // Sort dates
  const sortedDates = Array.from(allDates).sort();

  // Build merged data
  return sortedDates.map(date => {
    const row: Record<string, number | string> = { date };
    Object.entries(series).forEach(([name, ts]) => {
      row[name] = ts[date] ?? null;
    });
    return row;
  });
}

/**
 * Calculates percentage change between first and last values.
 */
export function calculateTotalReturn(data: TimeSeriesData): number {
  const values = timeSeriestoArray(data);
  if (values.length < 2) return 0;
  
  const first = values[0].value;
  const last = values[values.length - 1].value;
  
  if (first === 0) return 0;
  return (last - first) / first;
}

/**
 * Finds a value by header name in a result line.
 */
export function findValueByHeader(
  line: QueryResultLine,
  headers: string[],
  headerName: string
): QueryResultValue | null {
  const index = headers.indexOf(headerName);
  if (index === -1 || index >= line.values.length) {
    return null;
  }
  return line.values[index];
}

/**
 * Extracts a specific timeseries by header name from the root line.
 */
export function extractTimeSeriesByHeader(
  matrix: QueryResultMatrix,
  headerName: string
): TimeSeriesData | null {
  const value = findValueByHeader(matrix.resultLine, matrix.headers, headerName);
  if (!value) return null;
  return extractTimeSeries(value);
}
```

Create `src/utils/tree.ts`:

```typescript
// ============================================================================
// Tree Traversal Utility Functions
// ============================================================================

import { QueryResultLine, QueryResultMatrix } from '../api/types';

/**
 * Callback function for tree traversal.
 */
type TraversalCallback = (
  line: QueryResultLine,
  depth: number,
  path: string[]
) => void;

/**
 * Recursively traverses the result line tree.
 * Calls the callback for each line with depth and path information.
 */
export function traverseResultTree(
  line: QueryResultLine,
  callback: TraversalCallback,
  depth = 0,
  path: string[] = []
): void {
  const currentPath = [...path, line.name];
  callback(line, depth, currentPath);
  
  for (const subLine of line.subLines) {
    traverseResultTree(subLine, callback, depth + 1, currentPath);
  }
}

/**
 * Flattens the result tree into an array with depth information.
 */
export function flattenResultTree(
  matrix: QueryResultMatrix
): Array<{ line: QueryResultLine; depth: number; path: string[] }> {
  const result: Array<{ line: QueryResultLine; depth: number; path: string[] }> = [];
  
  traverseResultTree(matrix.resultLine, (line, depth, path) => {
    result.push({ line, depth, path });
  });
  
  return result;
}

/**
 * Finds a line by name at a specific depth.
 */
export function findLineByName(
  matrix: QueryResultMatrix,
  name: string,
  targetDepth?: number
): QueryResultLine | null {
  let found: QueryResultLine | null = null;
  
  traverseResultTree(matrix.resultLine, (line, depth) => {
    if (line.name === name) {
      if (targetDepth === undefined || depth === targetDepth) {
        found = line;
      }
    }
  });
  
  return found;
}

/**
 * Gets direct children of the root line (first level breakdown).
 */
export function getTopLevelBreakdown(matrix: QueryResultMatrix): QueryResultLine[] {
  return matrix.resultLine.subLines;
}

/**
 * Collects all leaf nodes (lines with no children).
 */
export function getLeafLines(matrix: QueryResultMatrix): QueryResultLine[] {
  const leaves: QueryResultLine[] = [];
  
  traverseResultTree(matrix.resultLine, (line) => {
    if (line.subLines.length === 0) {
      leaves.push(line);
    }
  });
  
  return leaves;
}

/**
 * Builds a map of line names to their data for quick lookup.
 */
export function buildLineMap(
  matrix: QueryResultMatrix
): Map<string, QueryResultLine> {
  const map = new Map<string, QueryResultLine>();
  
  traverseResultTree(matrix.resultLine, (line) => {
    map.set(line.name, line);
  });
  
  return map;
}
```

### 5.6 Main Export

Create `src/index.ts`:

```typescript
// ============================================================================
// QPLIX Client Library - Main Export
// ============================================================================

// Client
export { QplixClient } from './api/client';

// Types
export * from './api/types';

// Utilities
export * from './utils/timeseries';
export * from './utils/tree';

// Re-export commonly used types at top level
export type {
  QueryResultMatrix,
  QueryResultLine,
  QueryResultValue,
  EvaluationQueryParams,
  TimeSeriesData,
  LegalEntity,
  Custodian,
  VirtualEntity,
  Benchmark,
  Preset,
  Security,
  Investment,
} from './api/types';
```

---

## 6. Usage Examples

### 6.1 Basic Setup

```typescript
import { QplixClient } from './src';

// Initialize client with credentials
const client = new QplixClient({
  baseUrl: 'https://smd43.qplix.cloud',
  f5BearerToken: 'YOUR_F5_TOKEN',
  username: 'YOUR_USERNAME',
  password: 'YOUR_PASSWORD',
});

// Known IDs (provided by QPLIX for hackathon)
const LEGAL_ENTITY_ID = '5cb71a8b2c94de98b02aff19';
const PRESET_ID = '691dd5953022610895c1aeff';
```

### 6.2 Fetch Client Overview

```typescript
async function getClientOverview() {
  // Get legal entity details
  const entity = await client.getLegalEntity(LEGAL_ENTITY_ID);
  console.log('Client:', entity.name);

  // Get custodians
  const custodians = await client.getCustodians(LEGAL_ENTITY_ID);
  console.log('Custodians:', custodians.map(c => c.name));

  // Get virtual entities
  const virtualEntities = await client.getVirtualEntities(LEGAL_ENTITY_ID);
  console.log('Portfolios:', virtualEntities.map(v => v.name));

  // Get benchmarks
  const benchmarks = await client.getLegalEntityBenchmarks(LEGAL_ENTITY_ID);
  console.log('Benchmarks:', benchmarks.map(b => b.name));
}
```

### 6.3 Fetch Wealth Timeseries Data

```typescript
import {
  extractTimeSeriesByHeader,
  timeSeriestoArray,
  calculateTotalReturn,
  getTopLevelBreakdown,
} from './src';

async function getWealthData() {
  // Fetch evaluation results
  const results = await client.getEvaluation(PRESET_ID, LEGAL_ENTITY_ID, {
    startDate: '2024-01-01',
    dueDate: '2025-01-15',
    interval: 'Monthly',
  });

  // Log available headers (columns)
  console.log('Available metrics:', results.headers);

  // Extract total wealth timeseries (adjust header name based on preset)
  const wealthTimeSeries = extractTimeSeriesByHeader(results, 'Market Value');
  
  if (wealthTimeSeries) {
    const dataPoints = timeSeriestoArray(wealthTimeSeries);
    console.log('Wealth over time:', dataPoints);
    
    const totalReturn = calculateTotalReturn(wealthTimeSeries);
    console.log('Total return:', (totalReturn * 100).toFixed(2) + '%');
  }

  // Get asset allocation (first level breakdown)
  const breakdown = getTopLevelBreakdown(results);
  console.log('Asset classes:', breakdown.map(b => b.name));
}
```

### 6.4 Build Chart Data

```typescript
import { mergeTimeSeries, extractTimeSeries, findValueByHeader } from './src';

async function buildChartData() {
  const results = await client.getEvaluation(PRESET_ID, LEGAL_ENTITY_ID, {
    startDate: '2024-01-01',
    dueDate: '2025-01-15',
    interval: 'Monthly',
  });

  // Build multi-series chart data for asset class breakdown
  const series: Record<string, TimeSeriesData> = {};
  
  // Add total portfolio
  const totalValue = findValueByHeader(
    results.resultLine,
    results.headers,
    'Market Value'
  );
  if (totalValue) {
    const ts = extractTimeSeries(totalValue);
    if (ts) series['Total'] = ts;
  }

  // Add each asset class
  for (const subLine of results.resultLine.subLines) {
    const value = findValueByHeader(subLine, results.headers, 'Market Value');
    if (value) {
      const ts = extractTimeSeries(value);
      if (ts) series[subLine.name] = ts;
    }
  }

  // Merge into chart-ready format
  const chartData = mergeTimeSeries(series);
  console.log('Chart data:', chartData);
  
  // Output format:
  // [
  //   { date: '2024-01-01', Total: 1000000, Equities: 600000, Bonds: 400000 },
  //   { date: '2024-02-01', Total: 1025000, Equities: 620000, Bonds: 405000 },
  //   ...
  // ]
}
```

### 6.5 React Hook Example

```typescript
import { useState, useEffect } from 'react';
import { QplixClient, QueryResultMatrix, EvaluationQueryParams } from './src';

// Singleton client instance
const client = new QplixClient({
  baseUrl: process.env.QPLIX_BASE_URL!,
  f5BearerToken: process.env.QPLIX_F5_TOKEN!,
  username: process.env.QPLIX_USERNAME!,
  password: process.env.QPLIX_PASSWORD!,
});

interface UseEvaluationResult {
  data: QueryResultMatrix | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useEvaluation(
  presetId: string,
  legalEntityId: string,
  params: EvaluationQueryParams
): UseEvaluationResult {
  const [data, setData] = useState<QueryResultMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await client.getEvaluation(presetId, legalEntityId, params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [presetId, legalEntityId, JSON.stringify(params)]);

  return { data, loading, error, refetch: fetchData };
}

// Usage in component:
function WealthChart() {
  const { data, loading, error } = useEvaluation(
    PRESET_ID,
    LEGAL_ENTITY_ID,
    {
      startDate: '2024-01-01',
      dueDate: '2025-01-15',
      interval: 'Monthly',
    }
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>No data</div>;

  // Render chart with data...
  return <div>{/* Chart component */}</div>;
}
```

---

## 7. Error Handling

### 7.1 Common Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid/expired tokens | Re-authenticate |
| 403 Forbidden | Insufficient permissions | Check user roles |
| 404 Not Found | Invalid ID | Verify entity/preset IDs |
| 400 Bad Request | Invalid parameters | Check query params format |
| 500 Server Error | Server issue | Retry with backoff |

### 7.2 Retry Logic

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry client errors (4xx)
      if (lastError.message.includes('401') || 
          lastError.message.includes('403') ||
          lastError.message.includes('404')) {
        throw lastError;
      }
      
      // Wait before retrying
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  
  throw lastError!;
}

// Usage:
const data = await withRetry(() => 
  client.getEvaluation(presetId, legalEntityId, params)
);
```

---

## Quick Reference

### Essential IDs (from QPLIX hackathon)

```typescript
const CONFIG = {
  // Environment
  BASE_URL: 'https://smd43.qplix.cloud', // or smd44
  
  // Provided by QPLIX
  F5_BEARER_TOKEN: '...',
  USERNAME: '...',
  PASSWORD: '...',
  
  // Example IDs (verify with QPLIX)
  LEGAL_ENTITY_ID: '5cb71a8b2c94de98b02aff19',
  PRESET_IDS: {
    WEALTH_OVERVIEW: '691dd5953022610895c1aeff',
    // Add other presets as discovered
  },
};
```

### API Call Checklist

1. ✅ Authenticate first (automatic in client)
2. ✅ Use correct preset ID for desired metrics
3. ✅ Set appropriate date range (startDate, dueDate)
4. ✅ Choose interval (Monthly recommended for dashboards)
5. ✅ Handle timeseries data extraction
6. ✅ Navigate hierarchical tree structure for breakdowns

---

## Summary

This guide provides everything needed to:

1. **Understand** the QPLIX wealth management domain
2. **Authenticate** with the dual-token system
3. **Fetch** timeseries data via the evaluation endpoint
4. **Parse** hierarchical QueryResultMatrix structures
5. **Extract** timeseries for charts and visualizations
6. **Navigate** the tree structure for drill-down analysis

The TypeScript client is designed to be:
- Type-safe with full TypeScript definitions
- Easy to use with async/await patterns
- Extensible for additional endpoints
- Compatible with React hooks pattern
