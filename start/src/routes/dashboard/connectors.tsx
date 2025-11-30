import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Plus,
  Plug,
  Trash2,
  Pencil,
  Play,
  Loader2,
  Check,
  X,
  ExternalLink,
  Key
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getConnectors,
  addConnector,
  updateConnector,
  deleteConnector,
  testConnector
} from '@/lib/connector-service'
import { assetCategories, type AssetCategory } from '@/lib/config/asset-categories'
import type { Connector, ConnectorFetchResult, ConnectorTool } from '@/lib/types/connector'

const TOOLS: { value: ConnectorTool; label: string }[] = [
  { value: 'timeline', label: 'Timeline Analytics' },
  { value: 'government', label: 'Government Analytics' },
]

const CATEGORIES = Object.keys(assetCategories) as AssetCategory[]

export const Route = createFileRoute('/dashboard/connectors')({
  component: ConnectorsPage,
})

function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConnector, setEditingConnector] = useState<Connector | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<ConnectorFetchResult | null>(null)

  const loadConnectors = async () => {
    setLoading(true)
    try {
      const data = await getConnectors()
      setConnectors(data)
    } catch (error) {
      console.error('Failed to load connectors:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConnectors()
  }, [])

  const handleAdd = () => {
    setEditingConnector(null)
    setDialogOpen(true)
  }

  const handleEdit = (connector: Connector) => {
    setEditingConnector(connector)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connector?')) return
    await deleteConnector({ data: id })
    loadConnectors()
  }

  const handleToggle = async (connector: Connector) => {
    await updateConnector({ data: { id: connector.id, enabled: !connector.enabled } })
    loadConnectors()
  }

  const handleTest = async (connector: Connector) => {
    setTestingId(connector.id)
    setTestResult(null)
    try {
      const result = await testConnector({ data: connector })
      setTestResult(result)
      await updateConnector({
        data: {
          id: connector.id,
          lastFetch: result.fetchedAt,
          lastStatus: result.success ? 'success' : 'error',
          lastError: result.error,
        }
      })
      loadConnectors()
    } catch (error) {
      setTestResult({
        connectorId: connector.id,
        connectorName: connector.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fetchedAt: new Date().toISOString(),
      })
    } finally {
      setTestingId(null)
    }
  }

  const handleSave = async (formData: Omit<Connector, 'id'>) => {
    if (editingConnector) {
      await updateConnector({ data: { id: editingConnector.id, ...formData } })
    } else {
      await addConnector({ data: formData })
    }
    setDialogOpen(false)
    loadConnectors()
  }

  const getCategoryLabel = (category: AssetCategory) => {
    return assetCategories[category]?.label || category
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Connectors</h1>
          <p className="text-muted-foreground text-sm">
            Configure API endpoints to enrich timeline analysis
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="size-4" />
          Add Connector
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : connectors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Plug className="size-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No connectors configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add API endpoints to pull external data into your timeline analysis
            </p>
            <Button onClick={handleAdd} variant="outline" className="gap-2">
              <Plus className="size-4" />
              Add your first connector
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connectors.map((connector) => (
            <Card key={connector.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${connector.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Plug className={`size-5 ${connector.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {connector.name}
                        {connector.apiKey && <Key className="size-3 text-muted-foreground" />}
                        {connector.lastStatus === 'success' && (
                          <Check className="size-4 text-green-500" />
                        )}
                        {connector.lastStatus === 'error' && (
                          <X className="size-4 text-red-500" />
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 text-xs font-mono truncate max-w-md">
                        {connector.url}
                        <ExternalLink className="size-3 shrink-0" />
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={connector.enabled}
                      onCheckedChange={() => handleToggle(connector)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex flex-wrap gap-1">
                  {(connector.categories || []).map((category) => (
                    <Badge key={category} variant="secondary" className="text-xs">
                      {getCategoryLabel(category)}
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground mr-1">Tools:</span>
                  {(connector.tools || ['timeline']).map((tool) => (
                    <Badge key={tool} variant="outline" className="text-xs">
                      {TOOLS.find((t) => t.value === tool)?.label || tool}
                    </Badge>
                  ))}
                </div>

                {connector.dataPath && (
                  <p className="text-xs text-muted-foreground">
                    Data path: <code className="bg-muted px-1 rounded">{connector.dataPath}</code>
                  </p>
                )}

                {connector.lastFetch && (
                  <p className="text-xs text-muted-foreground">
                    Last fetched: {new Date(connector.lastFetch).toLocaleString()}
                    {connector.lastError && (
                      <span className="text-red-500 ml-2">({connector.lastError})</span>
                    )}
                  </p>
                )}

                <Separator />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(connector)}
                    disabled={testingId === connector.id}
                    className="gap-1"
                  >
                    {testingId === connector.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Play className="size-3" />
                    )}
                    Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(connector)}
                    className="gap-1"
                  >
                    <Pencil className="size-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(connector.id)}
                    className="gap-1 text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="size-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {testResult && (
        <Card className={testResult.success ? 'border-green-500' : 'border-red-500'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {testResult.success ? (
                <>
                  <Check className="size-4 text-green-500" />
                  Test Successful
                </>
              ) : (
                <>
                  <X className="size-4 text-red-500" />
                  Test Failed
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResult.success ? (
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-red-500">{testResult.error}</p>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTestResult(null)}
              className="mt-2"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <ConnectorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        connector={editingConnector}
        onSave={handleSave}
      />
    </div>
  )
}

function ConnectorDialog({
  open,
  onOpenChange,
  connector,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  connector: Connector | null
  onSave: (data: Omit<Connector, 'id'>) => void
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [dataPath, setDataPath] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<AssetCategory[]>([])
  const [selectedTools, setSelectedTools] = useState<ConnectorTool[]>(['timeline'])
  const [enabled, setEnabled] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (connector) {
      setName(connector.name)
      setUrl(connector.url)
      setApiKey(connector.apiKey || '')
      setDataPath(connector.dataPath || '')
      setSelectedCategories(connector.categories)
      setSelectedTools(connector.tools || ['timeline'])
      setEnabled(connector.enabled)
    } else {
      setName('')
      setUrl('')
      setApiKey('')
      setDataPath('')
      setSelectedCategories([])
      setSelectedTools(['timeline'])
      setEnabled(true)
    }
  }, [connector, open])

  const toggleCategory = (category: AssetCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }

  const toggleTool = (tool: ConnectorTool) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !url.trim() || selectedCategories.length === 0 || selectedTools.length === 0) return

    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        url: url.trim(),
        apiKey: apiKey.trim() || undefined,
        dataPath: dataPath.trim() || undefined,
        categories: selectedCategories,
        tools: selectedTools,
        enabled,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {connector ? 'Edit Connector' : 'Add Connector'}
          </DialogTitle>
          <DialogDescription>
            Configure an API endpoint to fetch data for timeline analysis
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Financial News API"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">API URL</label>
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/data"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Key className="size-4" />
              API Key (optional)
            </label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your API key"
            />
            <p className="text-xs text-muted-foreground">
              Will be sent as Bearer token in Authorization header
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data Path (optional)</label>
            <Input
              value={dataPath}
              onChange={(e) => setDataPath(e.target.value)}
              placeholder="e.g., data.items or results"
            />
            <p className="text-xs text-muted-foreground">
              JSON path to extract nested data (e.g., &quot;data.articles&quot;)
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Categories</label>
            <p className="text-xs text-muted-foreground mb-2">
              Select which asset categories this connector applies to
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 border rounded-md">
              {CATEGORIES.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategories.includes(category) ? 'default' : 'outline'}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => toggleCategory(category)}
                >
                  {assetCategories[category].label}
                </Badge>
              ))}
            </div>
            {selectedCategories.length === 0 && (
              <p className="text-xs text-red-500">Select at least one category</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tools</label>
            <p className="text-xs text-muted-foreground mb-2">
              Select which analytics tools can use this connector
            </p>
            <div className="flex flex-wrap gap-1.5 p-2 border rounded-md">
              {TOOLS.map((tool) => (
                <Badge
                  key={tool.value}
                  variant={selectedTools.includes(tool.value) ? 'default' : 'outline'}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => toggleTool(tool.value)}
                >
                  {tool.label}
                </Badge>
              ))}
            </div>
            {selectedTools.length === 0 && (
              <p className="text-xs text-red-500">Select at least one tool</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Enabled</label>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !url.trim() || selectedCategories.length === 0 || selectedTools.length === 0 || saving}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              {connector ? 'Save Changes' : 'Add Connector'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
