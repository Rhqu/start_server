import { createFileRoute, Link } from '@tanstack/react-router'
import { LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlayground } from '@/hooks/use-playground'
import { PlaygroundGrid } from '@/components/playground/PlaygroundGrid'
import { ExportPDFButton } from '@/components/playground/ExportPDFButton'

export const Route = createFileRoute('/dashboard/playground')({
  component: PlaygroundPage,
})

function PlaygroundPage() {
  const { charts, removeChart, reorderCharts, clearAll, toggleSize } = usePlayground()

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Playground</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage and export your embedded charts
          </p>
        </div>
        {charts.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={clearAll}>
              Clear All
            </Button>
            <ExportPDFButton />
          </div>
        )}
      </div>

      {/* Content */}
      {charts.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <LayoutGrid className="size-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No charts yet</h3>
          <p className="text-muted-foreground text-sm max-w-md mb-6">
            Ask Cube to generate charts, then click "Embed" to add them here.
          </p>
          <Link to="/dashboard">
            <Button>Go to Intelligence</Button>
          </Link>
        </div>
      ) : (
        <PlaygroundGrid
          charts={charts}
          onReorder={reorderCharts}
          onRemove={removeChart}
          onToggleSize={toggleSize}
        />
      )}
    </div>
  )
}
