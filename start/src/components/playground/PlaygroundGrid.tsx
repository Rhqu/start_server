'use client'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { PlaygroundChartCard } from './PlaygroundChartCard'
import type { PlaygroundChart } from '@/lib/playground-store'
import { cn } from '@/lib/utils'

interface Props {
  charts: PlaygroundChart[]
  onReorder: (chartIds: string[]) => void
  onRemove: (id: string) => void
  onToggleSize: (id: string) => void
}

export function PlaygroundGrid({ charts, onReorder, onRemove, onToggleSize }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = charts.findIndex(c => c.id === active.id)
    const newIndex = charts.findIndex(c => c.id === over.id)
    const reordered = arrayMove(charts, oldIndex, newIndex)
    onReorder(reordered.map(c => c.id))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={charts.map(c => c.id)}
        strategy={rectSortingStrategy}
      >
        <div
          id="playground-grid"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {charts.map(chart => (
            <div
              key={chart.id}
              className={cn(
                "transition-all duration-300 ease-in-out",
                chart.size === 2 ? 'md:col-span-2' : ''
              )}
              style={{
                gridColumn: chart.size === 2 ? 'span 2' : 'auto'
              }}
            >
              <PlaygroundChartCard
                chart={chart}
                onRemove={onRemove}
                onToggleSize={onToggleSize}
              />
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
