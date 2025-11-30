import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'
import { memo } from 'react'

export interface RelationshipEdgeData {
  relationship: string
  strength: number
}

function RelationshipEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<RelationshipEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const strokeWidth = data?.strength ? data.strength * 0.5 + 0.5 : 1
  const opacity = data?.strength ? data.strength * 0.15 + 0.25 : 0.5

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          strokeWidth,
          stroke: selected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
          opacity: selected ? 1 : opacity,
        }}
      />
      {selected && data?.relationship && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan bg-background border rounded px-1.5 py-0.5 text-[10px] shadow-sm"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
          >
            {data.relationship}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const RelationshipEdge = memo(RelationshipEdgeComponent)
