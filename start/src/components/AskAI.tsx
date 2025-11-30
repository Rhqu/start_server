"use client"

import { Box } from "lucide-react"
import { useChatSidebar } from "@/components/ChatWrapper"
import { cn } from "@/lib/utils"
import { Shimmer } from "@/components/ai-elements/shimmer"

interface AskAIProps {
  prompt: string           // System context/instruction
  children?: React.ReactNode
  className?: string
  title?: string
}

export function AskAI({ prompt, children, className, title = "Ask AI" }: AskAIProps) {
  const { toggle, open, sendMessageWithContext } = useChatSidebar()

  const handleClick = async () => {
    if (!open) toggle()
    await sendMessageWithContext({ text: prompt })
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "bg-zinc-800/80 backdrop-blur-sm text-zinc-300 text-xs font-medium",
        "hover:bg-zinc-700/80 hover:text-zinc-100 transition-colors",
        "border border-zinc-700/50",
        className
      )}
      title={title}
    >
      {children || (
        <>
          <Box className="size-3" />
          <Shimmer className="text-xs" duration={3}>Ask</Shimmer>
        </>
      )}
    </button>
  )
}
