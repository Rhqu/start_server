import type { AssetCategory } from '@/lib/config/asset-categories'

export type { AssetCategory }

export type ConnectorTool = 'timeline' | 'government'

export interface Connector {
  id: string
  name: string
  url: string
  enabled: boolean
  categories: AssetCategory[]
  tools: ConnectorTool[]
  apiKey?: string
  dataPath?: string
  headers?: Record<string, string>
  lastFetch?: string
  lastStatus?: 'success' | 'error'
  lastError?: string
}

export interface ConnectorFormData {
  name: string
  url: string
  enabled: boolean
  categories: AssetCategory[]
  tools: ConnectorTool[]
  apiKey?: string
  dataPath?: string
  headers?: Record<string, string>
}

export interface ConnectorFetchResult {
  connectorId: string
  connectorName: string
  success: boolean
  data?: unknown
  error?: string
  fetchedAt: string
}

export interface ConnectorsFile {
  connectors: Connector[]
}
