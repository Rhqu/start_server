'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X, GripVertical, RectangleVertical, RectangleHorizontal } from 'lucide-react'
import { BarChartDisplay } from '@/components/ai-elements/BarChartDisplay'
import { PieChartDisplay } from '@/components/ai-elements/PieChartDisplay'
import { LineChartDisplay } from '@/components/ai-elements/LineChartDisplay'
import type { PlaygroundChart } from '@/lib/playground-store'
import { cn } from '@/lib/utils'
import type { BarChartData, PieChartData, LineChartData } from '@/lib/schemas/charts'
import { Button } from '@/components/ui/button'

interface Props {
  chart: PlaygroundChart
  onRemove: (id: string) => void
  onToggleSize: (id: string) => void
}

export function PlaygroundChartCard({ chart, onRemove, onToggleSize }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chart.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative rounded-xl p-3 bg-card overflow-hidden",
        "border-2 border-dashed",
        "bg-[length:8px_8px]",
        "bg-gradient-to-r from-border/50 via-transparent to-border/50",
        "transition-all duration-200 ease-out",
        isDragging && "opacity-60 ring-2 ring-primary shadow-2xl scale-105 z-50"
      )}
    >
      {/* Top Controls */}
      <div className="flex items-center justify-between mb-2">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center gap-2 cursor-move hover:bg-muted/50 p-2 rounded-lg transition-colors"
        >
          <GripVertical className="size-4 text-muted-foreground" />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleSize(chart.id)}
            title={chart.size === 1 ? "Expand to 2x width" : "Shrink to 1x width"}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            {chart.size === 1 ? (
              <RectangleVertical className="size-4" />
            ) : (
              <RectangleHorizontal className="size-4" />
            )}
          </button>
          <button
            onClick={() => onRemove(chart.id)}
            title="Remove chart"
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Chart Content - No embed button in playground */}
      <div className="overflow-hidden">
        {chart.type === 'bar' ? (
          <BarChartDisplay data={chart.data as BarChartData} hideEmbed />
        ) : chart.type === 'pie' ? (
          <PieChartDisplay data={chart.data as PieChartData} hideEmbed />
        ) : (
          <LineChartDisplay data={chart.data as LineChartData} hideEmbed />
        )}
      </div>
    </div>
  )
}
