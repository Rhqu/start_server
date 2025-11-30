import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { PortfolioGraphView } from '@/components/portfolio-graph/PortfolioGraphView'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Network, Loader2 } from 'lucide-react'
import type { PortfolioGraph } from '@/lib/schemas/portfolio-graph'

export const Route = createFileRoute('/dashboard/network')({
  component: NetworkPage,
})

function NetworkPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 3)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [graphData, setGraphData] = useState<PortfolioGraph | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/portfolio-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to generate graph')
      }

      const data = await response.json()
      setGraphData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="size-6" />
            Portfolio Network
          </h1>
          <p className="text-sm text-muted-foreground">
            Visualize connections between market events across all asset categories
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36"
            />
          </div>

          <Button onClick={handleGenerate} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Network className="size-4" />
                Generate Network
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-red-500 bg-red-500/10">
          <p className="text-sm text-red-500">{error}</p>
        </Card>
      )}

      <Card className="flex-1 min-h-0 overflow-hidden">
        <PortfolioGraphView data={graphData} loading={loading} />
      </Card>
    </div>
  )
}
