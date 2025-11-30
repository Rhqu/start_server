import { createServerFn } from '@tanstack/react-start'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { nanoid } from 'nanoid'
import type {
  Connector,
  ConnectorFormData,
  ConnectorFetchResult,
  ConnectorsFile,
} from './types/connector'

const CONNECTORS_PATH = join(process.cwd(), 'db', 'connectors.json')

function loadConnectors(): ConnectorsFile {
  if (!existsSync(CONNECTORS_PATH)) {
    return { connectors: [] }
  }
  const file = JSON.parse(readFileSync(CONNECTORS_PATH, 'utf-8')) as ConnectorsFile
  // Migrate old connectors without 'tools' field
  file.connectors = file.connectors.map((c) => ({
    ...c,
    tools: c.tools ?? ['timeline'], // Default to timeline for backwards compat
  }))
  return file
}

function saveConnectors(data: ConnectorsFile): void {
  writeFileSync(CONNECTORS_PATH, JSON.stringify(data, null, 2))
}

export const getConnectors = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Connector[]> => {
    return loadConnectors().connectors
  }
)

export const addConnector = createServerFn({ method: 'POST' })
  .inputValidator((input: ConnectorFormData) => input)
  .handler(async ({ data }): Promise<Connector> => {
    const file = loadConnectors()
    const connector: Connector = {
      id: nanoid(),
      name: data.name,
      url: data.url,
      enabled: data.enabled,
      categories: data.categories,
      tools: data.tools,
      apiKey: data.apiKey,
      dataPath: data.dataPath,
      headers: data.headers,
    }
    file.connectors.push(connector)
    saveConnectors(file)
    return connector
  })

export const updateConnector = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string } & Partial<Connector>) => input)
  .handler(async ({ data }): Promise<Connector | null> => {
    const file = loadConnectors()
    const index = file.connectors.findIndex((c) => c.id === data.id)
    if (index === -1) return null

    const existing = file.connectors[index]
    file.connectors[index] = {
      id: existing.id,
      name: data.name ?? existing.name,
      url: data.url ?? existing.url,
      enabled: data.enabled ?? existing.enabled,
      categories: data.categories ?? existing.categories,
      tools: data.tools ?? existing.tools,
      apiKey: data.apiKey !== undefined ? data.apiKey : existing.apiKey,
      dataPath: data.dataPath !== undefined ? data.dataPath : existing.dataPath,
      headers: data.headers !== undefined ? data.headers : existing.headers,
      lastFetch: data.lastFetch !== undefined ? data.lastFetch : existing.lastFetch,
      lastStatus: data.lastStatus !== undefined ? data.lastStatus : existing.lastStatus,
      lastError: data.lastError !== undefined ? data.lastError : existing.lastError,
    }
    saveConnectors(file)
    return file.connectors[index]
  })

export const deleteConnector = createServerFn({ method: 'POST' })
  .inputValidator((input: string) => input)
  .handler(async ({ data: id }): Promise<boolean> => {
    const file = loadConnectors()
    const index = file.connectors.findIndex((c) => c.id === id)
    if (index === -1) return false

    file.connectors.splice(index, 1)
    saveConnectors(file)
    return true
  })

function extractDataPath(data: unknown, path?: string): unknown {
  if (!path) return data
  const keys = path.split('.')
  let result: unknown = data
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key]
    } else {
      return null
    }
  }
  return result
}

export async function fetchConnectorData(
  connector: Connector
): Promise<ConnectorFetchResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const headers: Record<string, string> = { ...connector.headers }
    if (connector.apiKey) {
      headers['Authorization'] = `Bearer ${connector.apiKey}`
    }

    const response = await fetch(connector.url, {
      headers,
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 1024 * 1024) {
      throw new Error('Response too large (>1MB)')
    }

    const rawData = await response.json()
    const data = extractDataPath(rawData, connector.dataPath)

    return {
      connectorId: connector.id,
      connectorName: connector.name,
      success: true,
      data,
      fetchedAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      connectorId: connector.id,
      connectorName: connector.name,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fetchedAt: new Date().toISOString(),
    }
  } finally {
    clearTimeout(timeout)
  }
}

export const testConnector = createServerFn({ method: 'POST' })
  .inputValidator((input: Connector) => input)
  .handler(async ({ data: connector }): Promise<ConnectorFetchResult> => {
    return fetchConnectorData(connector)
  })

export function formatConnectorDataForAI(
  results: ConnectorFetchResult[]
): string {
  const successful = results.filter((r) => r.success && r.data)
  if (successful.length === 0) return ''

  const sections = successful.map((r) => {
    const dataStr =
      typeof r.data === 'string' ? r.data : JSON.stringify(r.data, null, 2)
    const truncated =
      dataStr.length > 5000 ? dataStr.slice(0, 5000) + '\n...[truncated]' : dataStr
    return `### Source: ${r.connectorName}\n\`\`\`json\n${truncated}\n\`\`\``
  })

  return sections.join('\n\n')
}
