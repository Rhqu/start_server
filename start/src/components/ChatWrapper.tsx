"use client"

import { Chat } from "@/components/Chat"
import { useState, createContext, useContext, useMemo, useCallback, useEffect } from "react"
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

function QubeLogo({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" className={className}>
      <path d="M50 8 L88 28 L88 72 L50 92 L12 72 L12 28 Z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.25"/>
      <path d="M50 8 L88 28 L50 48 L12 28 Z" fill="currentColor" opacity="0.04"/>
      <line x1="50" y1="48" x2="50" y2="92" stroke="currentColor" strokeWidth="1" opacity="0.15"/>
      <line x1="12" y1="28" x2="50" y2="48" stroke="currentColor" strokeWidth="1" opacity="0.12"/>
      <line x1="88" y1="28" x2="50" y2="48" stroke="currentColor" strokeWidth="1" opacity="0.12"/>
      <line x1="50" y1="20" x2="50" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      <circle cx="50" cy="10" r="4" fill="hsl(var(--primary))" className="animate-glow-slow"/>
      <path d="M25 50 Q25 20 50 20 Q75 20 75 50 Q75 70 50 70 Q25 70 25 50" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="2"/>
      <path d="M30 38 Q30 25 50 25 Q70 25 70 38" fill="currentColor" opacity="0.06" stroke="none"/>
      <ellipse cx="22" cy="45" rx="5" ry="7" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
      <ellipse cx="78" cy="45" rx="5" ry="7" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="32" y="28" rx="8" width="36" height="26" fill="currentColor" opacity="0.35" stroke="currentColor" strokeWidth="1.5"/>
      <g className="animate-blink-friendly" style={{ transformOrigin: '40px 44px' }}>
        <ellipse cx="40" cy="44" rx="6" ry="24" fill="hsl(var(--primary))" className="animate-glow-slow"/>
        <ellipse cx="41.5" cy="34" rx="2" ry="5" fill="white" opacity="0.9"/>
      </g>
      <g className="animate-blink-friendly" style={{ transformOrigin: '60px 44px' }}>
        <ellipse cx="60" cy="44" rx="6" ry="24" fill="hsl(var(--primary))" className="animate-glow-slow"/>
        <ellipse cx="61.5" cy="34" rx="2" ry="5" fill="white" opacity="0.9"/>
      </g>
      <rect x="42" y="68" rx="3" width="16" height="8" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )
}

export { QubeLogo }

type SendOptions = {
  text?: string
  systemContext?: string
}

type ChatContextType = {
  toggle: () => void
  open: boolean
  setOpen: (open: boolean) => void
  messages: ReturnType<typeof useChat>['messages']
  sendMessageWithContext: (options: SendOptions) => Promise<void>
  status: ReturnType<typeof useChat>['status']
  error: ReturnType<typeof useChat>['error']
}

const ChatContext = createContext<ChatContextType | null>(null)

export function useChatSidebar() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("useChatSidebar must be inside ChatWrapper")
  return ctx
}

export function ChatWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen(o => !o)

  useEffect(() => {
    setMounted(true)
  }, [])

  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/chat' }), [])

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
  })

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setMessages([])
    }
  }, [setMessages])

  const sendMessageWithContext = useCallback(async (options: SendOptions) => {
    const { text, systemContext } = options
    await sendMessage({
      text: text || "Analyze",
      body: systemContext ? { systemContext } : undefined,
    })
  }, [sendMessage])

  return (
    <ChatContext.Provider value={{ toggle, open, setOpen, messages, sendMessageWithContext, status, error }}>
      <div className="flex h-screen w-full">
        {children}
      </div>

      {/* Floating QUBE button with gradient/particles */}
      <button
        onClick={toggle}
        className="fixed bottom-6 right-6 z-[9999] p-3 rounded-xl bg-gradient-to-br from-primary/10 via-primary/20 to-primary/10 backdrop-blur-sm border border-primary/20 shadow-2xl hover:from-primary/15 hover:via-primary/25 hover:to-primary/15 transition-all duration-300 group overflow-hidden"
        title="Ask QUBE"
      >
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '8px 8px'
        }} />

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-1 h-1 bg-primary/30 rounded-full animate-pulse top-[20%] left-[25%]" />
          <div className="absolute w-0.5 h-0.5 bg-primary/20 rounded-full animate-pulse top-[60%] right-[30%]" style={{ animationDelay: '0.5s' }} />
          <div className="absolute w-1 h-1 bg-primary/25 rounded-full animate-pulse top-[40%] left-[60%]" style={{ animationDelay: '1s' }} />
        </div>

        <QubeLogo className="size-10 text-foreground relative z-10 group-hover:scale-110 transition-transform duration-300" />
      </button>

      {/* Chat modal */}
      {mounted && (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden">
            <VisuallyHidden>
              <DialogTitle>AI Chat</DialogTitle>
            </VisuallyHidden>
            <Chat />
          </DialogContent>
        </Dialog>
      )}
    </ChatContext.Provider>
  )
}
