"use client"

import { Button } from "@/components/ui/button"
import { Download, ArrowDownLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChartActionToolbarProps {
  onDownload?: () => void
  onEmbed?: () => void
  className?: string
}

export function ChartActionToolbar({ onDownload, onEmbed, className }: ChartActionToolbarProps) {
  if (!onDownload && !onEmbed) return null

  return (
    <div className={cn("flex items-center justify-end gap-1 w-full", className)}>
      {onDownload && (
        <Button
          variant="outline"
          size="icon"
          onClick={onDownload}
          title="Download"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Download className="size-4" />
        </Button>
      )}
      {onEmbed && (
        <Button
          variant="outline"
          size="icon"
          onClick={onEmbed}
          title="Embed to Playground"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <ArrowDownLeft className="size-4" />
        </Button>
      )}
    </div>
  )
}
