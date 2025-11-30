import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface EventNodeData {
  title: string
  date: string
  impactScore: number
  source: string
  url: string
  description: string
  category: string
  color: string
}

function getImpactColor(score: number): string {
  if (score >= 4) return 'bg-green-500'
  if (score >= 2) return 'bg-green-400'
  if (score >= 1) return 'bg-green-300'
  if (score === 0) return 'bg-gray-400'
  if (score >= -1) return 'bg-red-300'
  if (score >= -3) return 'bg-red-400'
  return 'bg-red-500'
}

function EventNodeComponent({ data, selected }: NodeProps<{ data: EventNodeData }>) {
  const dateStr = new Date(data.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div
      className={`bg-card border rounded-lg shadow-md w-48 overflow-hidden transition-all ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
      style={{ borderLeftColor: data.color, borderLeftWidth: 3 }}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />

      <div className="p-2 space-y-1">
        <div className="flex items-start justify-between gap-1">
          <h4 className="text-xs font-medium leading-tight line-clamp-2">{data.title}</h4>
          <Badge className={`${getImpactColor(data.impactScore)} text-white text-[10px] px-1 py-0 shrink-0`}>
            {data.impactScore > 0 ? '+' : ''}{data.impactScore}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{dateStr}</span>
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {data.source}
            <ExternalLink className="size-2.5" />
          </a>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  )
}

export const EventNode = memo(EventNodeComponent)
