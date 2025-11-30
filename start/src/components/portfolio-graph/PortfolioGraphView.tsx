import { useCallback, useEffect, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { AssetCategoryNode, type AssetCategoryNodeData } from './AssetCategoryNode'
import { EventNode, type EventNodeData } from './EventNode'
import { RelationshipEdge, type RelationshipEdgeData } from './RelationshipEdge'
import { assetCategories, type AssetCategory } from '@/lib/config/asset-categories'
import type { PortfolioGraph, EventNode as EventNodeType, Connection } from '@/lib/schemas/portfolio-graph'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const nodeTypes = {
  category: AssetCategoryNode,
  event: EventNode,
}

const edgeTypes = {
  relationship: RelationshipEdge,
}

const CATEGORIES = Object.keys(assetCategories) as AssetCategory[]

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  const categoryNodes = nodes.filter((n) => n.type === 'category')
  const eventNodes = nodes.filter((n) => n.type === 'event')

  // Position categories in a 4x3 grid pattern
  const cols = 4
  const categorySpacingX = 450
  const categorySpacingY = 400

  const positionedCategoryNodes = categoryNodes.map((node, i) => ({
    ...node,
    position: {
      x: (i % cols) * categorySpacingX,
      y: Math.floor(i / cols) * categorySpacingY,
    },
  }))

  // Group events by category
  const eventsByCategory: Record<string, Node[]> = {}
  eventNodes.forEach((node) => {
    const cat = (node.data as EventNodeData).category
    if (!eventsByCategory[cat]) eventsByCategory[cat] = []
    eventsByCategory[cat].push(node)
  })

  // Position events in a circular cluster around their category
  const positionedEventNodes: Node[] = []
  positionedCategoryNodes.forEach((catNode) => {
    const catId = catNode.id.replace('category-', '')
    const events = eventsByCategory[catId] || []
    const radius = 140 // Distance from category center

    events.forEach((event, i) => {
      const angle = (2 * Math.PI * i) / events.length - Math.PI / 2
      positionedEventNodes.push({
        ...event,
        position: {
          x: catNode.position.x + Math.cos(angle) * radius - 56,
          y: catNode.position.y + Math.sin(angle) * radius + 40,
        },
      })
    })
  })

  return { nodes: [...positionedCategoryNodes, ...positionedEventNodes], edges }
}

interface PortfolioGraphViewProps {
  data: PortfolioGraph | null
  loading?: boolean
}

export function PortfolioGraphView({ data, loading }: PortfolioGraphViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedEvent, setSelectedEvent] = useState<EventNodeType | null>(null)

  useEffect(() => {
    if (!data) {
      setNodes([])
      setEdges([])
      return
    }

    // Create category nodes
    const categoryNodes: Node<AssetCategoryNodeData>[] = CATEGORIES.map((cat, index) => ({
      id: `category-${cat}`,
      type: 'category',
      position: { x: 0, y: 0 },
      data: {
        label: assetCategories[cat].label,
        color: assetCategories[cat].color,
        category: cat,
      },
    }))

    // Create event nodes
    const eventNodes: Node<EventNodeData>[] = data.events.map((event) => ({
      id: event.id,
      type: 'event',
      position: { x: 0, y: 0 },
      data: {
        title: event.title,
        date: event.date,
        impactScore: event.impactScore,
        source: event.source,
        url: event.url,
        description: event.description,
        category: event.category,
        color: assetCategories[event.category as AssetCategory]?.color || '#888',
      },
    }))

    // Create edges from events to their categories
    const categoryEdges: Edge[] = data.events.map((event) => ({
      id: `edge-${event.id}-category`,
      source: `category-${event.category}`,
      target: event.id,
      type: 'relationship',
      data: { relationship: '', strength: 1 },
    }))

    // Create edges from connections
    const connectionEdges: Edge<RelationshipEdgeData>[] = data.connections.map((conn, index) => ({
      id: `connection-${index}`,
      source: conn.source,
      target: conn.target,
      type: 'relationship',
      data: {
        relationship: conn.relationship,
        strength: conn.strength,
      },
    }))

    const allNodes = [...categoryNodes, ...eventNodes]
    const allEdges = [...categoryEdges, ...connectionEdges]

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(allNodes, allEdges)

    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [data, setNodes, setEdges])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'event' && data) {
        const event = data.events.find((e) => e.id === node.id)
        if (event) {
          setSelectedEvent(event)
        }
      }
    },
    [data]
  )

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Generating network graph...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Select a date range and generate the network</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'category') {
              return (node.data as AssetCategoryNodeData).color
            }
            return '#888'
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />

        <Panel position="top-left">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg p-2 text-xs text-muted-foreground">
            {data.events.length} events, {data.connections.length} connections
          </div>
        </Panel>
      </ReactFlow>

      {selectedEvent && (
        <Card className="absolute bottom-4 right-4 w-80 p-4 space-y-3 shadow-lg">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-sm leading-tight pr-2">{selectedEvent.title}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              onClick={() => setSelectedEvent(null)}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              style={{
                borderColor: assetCategories[selectedEvent.category as AssetCategory]?.color,
                color: assetCategories[selectedEvent.category as AssetCategory]?.color,
              }}
            >
              {assetCategories[selectedEvent.category as AssetCategory]?.label || selectedEvent.category}
            </Badge>
            <Badge variant={selectedEvent.impactScore >= 0 ? 'default' : 'destructive'}>
              {selectedEvent.impactScore > 0 ? '+' : ''}{selectedEvent.impactScore}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">{selectedEvent.description}</p>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <a
              href={selectedEvent.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              {selectedEvent.source}
              <ExternalLink className="size-3" />
            </a>
          </div>
        </Card>
      )}
    </div>
  )
}
