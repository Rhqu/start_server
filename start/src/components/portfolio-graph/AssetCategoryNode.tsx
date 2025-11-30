import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'

export interface AssetCategoryNodeData {
  label: string
  color: string
  category: string
}

function AssetCategoryNodeComponent({ data }: NodeProps<{ data: AssetCategoryNodeData }>) {
  return (
    <div
      className="flex items-center justify-center rounded-full border-2 shadow-lg"
      style={{
        width: 80,
        height: 80,
        backgroundColor: data.color + '20',
        borderColor: data.color,
      }}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="text-center px-1">
        <span className="text-xs font-semibold" style={{ color: data.color }}>
          {data.label}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  )
}

export const AssetCategoryNode = memo(AssetCategoryNodeComponent)
