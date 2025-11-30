'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input'
import { Loader } from '@/components/ai-elements/loader'
import { Suggestion } from '@/components/ai-elements/suggestion'
import { useChatSidebar, QubeLogo } from '@/components/ChatWrapper'
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from '@/components/ai-elements/chain-of-thought'
import { StockAnalysisChart } from '@/components/portfolio/stock-analysis-chart'
import { StockAnalysis } from '@/lib/schemas/stock-analysis'
import { PerformanceOverviewCharts } from '@/components/portfolio/performance-overview-charts'
import { PerformanceOverview } from '@/lib/schemas/performance-overview'
import { BarChartDisplay } from '@/components/ai-elements/BarChartDisplay'
import { PieChartDisplay } from '@/components/ai-elements/PieChartDisplay'
import { LineChartDisplay } from '@/components/ai-elements/LineChartDisplay'
import { BarChartData, PieChartData, LineChartData } from '@/lib/schemas/charts'

const CHAT_SUGGESTIONS = [
  "What's my portfolio performance?",
  "Show top 5 asset categories",
  "Which assets perform best?",
  "Compare liquid vs illiquid",
  "Analyze my cash flows",
]

type UIPart = {
  type: string
  text?: string
  state?:
  | 'streaming'
  | 'done'
  | 'input-streaming'
  | 'input-available'
  | 'output-available'
  | 'output-error'
  toolCallId?: string
  toolName?: string
  input?: unknown
  output?: unknown
  errorText?: string
  providerExecuted?: boolean
  preliminary?: boolean
}

type ChatMessage = {
  parts?: UIPart[]
}

function getTextContent(message: { parts?: Array<{ type: string; text?: string }> }) {
  return (message.parts ?? [])
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

function getReasoningParts(message: ChatMessage) {
  return (message.parts ?? []).filter((part) => part.type === 'reasoning')
}

function getToolInvocationParts(message: ChatMessage) {
  return (message.parts ?? []).filter(
    (part) => part.type === 'dynamic-tool' || part.type.startsWith('tool-')
  )
}

function getToolStatus(state: UIPart['state']): 'complete' | 'active' | 'pending' {
  switch (state) {
    case 'output-available':
      return 'complete'
    case 'output-error':
      return 'pending'
    case 'input-available':
    case 'input-streaming':
    default:
      return 'active'
  }
}

function getReasoningStatus(state: UIPart['state']): 'complete' | 'active' {
  if (state === 'streaming') return 'active'
  return 'complete'
}

function getToolName(part: UIPart) {
  if (part.toolName) return part.toolName
  return part.type.replace(/^tool-/, '')
}

function formatData(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function convertLatexDelimiters(text: string) {
  return text
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
    .replace(/^\[\s*/gm, '$$')
    .replace(/\s*\]$/gm, '$$')
}

function ChatInner() {
  const { messages, sendMessageWithContext, status, error } = useChatSidebar()

  return (
    <div className="flex flex-1 flex-col h-full w-full min-w-0 relative">
      {/* Animated background dots */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
        backgroundSize: '20px 20px'
      }} />

      {/* Gradient header with particles */}
      <header className="relative px-6 py-4 shrink-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b overflow-hidden">
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-1 h-1 bg-primary/20 rounded-full animate-pulse top-[30%] left-[10%]" />
          <div className="absolute w-0.5 h-0.5 bg-primary/15 rounded-full animate-pulse top-[60%] left-[25%]" style={{ animationDelay: '0.7s' }} />
          <div className="absolute w-1 h-1 bg-primary/20 rounded-full animate-pulse top-[40%] right-[15%]" style={{ animationDelay: '1.2s' }} />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <QubeLogo className="size-12 text-foreground" />
          <div>
            <h1 className="text-sm font-bold text-primary">QUBE</h1>
            <p className="text-[10px] text-muted-foreground">Your intelligent assistant</p>
          </div>
        </div>
      </header>
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 text-sm border-b border-destructive/20">
          Error: {error.message}
        </div>
      )}
      <Conversation className="flex-1 min-h-0 min-w-0 overflow-x-hidden scrollbar-hide">
        <ConversationContent className="w-full px-6 py-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Hello! I'm QUBE"
              description="Ask me about your portfolio, investments, or market analysis"
              icon={
                <div className="relative mb-4">
                  <QubeLogo className="size-24 text-foreground" />
                </div>
              }
            />
          ) : (
            messages.map((message) => {
              const reasoningParts = getReasoningParts(message)
              const toolParts = getToolInvocationParts(message)
              const hasChainOfThought = reasoningParts.length > 0 || toolParts.length > 0

              const chainOfThoughtBlock =
                message.role === 'assistant' && hasChainOfThought ? (
                  <div className="mb-3">
                    <ChainOfThought>
                      <ChainOfThoughtHeader>Chain of Thought</ChainOfThoughtHeader>
                      <ChainOfThoughtContent>
                        {reasoningParts.map((part, index) => (
                          <ChainOfThoughtStep
                            key={`${message.id}-reasoning-${index}`}
                            status={getReasoningStatus(part.state)}
                            label="Gedankengang"
                          >
                            {part.text && (
                              <p className="whitespace-pre-wrap text-xs text-foreground">
                                {part.text}
                              </p>
                            )}
                          </ChainOfThoughtStep>
                        ))}

                        {toolParts.map((part, index) => {
                          const toolName = getToolName(part)
                          return (
                            <ChainOfThoughtStep
                              key={`${message.id}-tool-${part.toolCallId ?? index}`}
                              status={getToolStatus(part.state)}
                              label={`Tool: ${toolName}`}
                              description={`Status: ${part.state ?? 'unbekannt'}`}
                            >
                              <div className="space-y-2 rounded-md border bg-muted/40 px-3 py-2 text-xs">
                                <div className="text-muted-foreground text-[11px]">
                                  Call ID: {part.toolCallId ?? '—'}
                                  {part.providerExecuted ? ' · Provider ausgeführt' : ''}
                                  {part.preliminary ? ' · vorläufig' : ''}
                                </div>

                                {part.input !== undefined && (
                                  <div className="space-y-1">
                                    <div className="font-medium">Input</div>
                                    <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-background/60 p-2 text-[11px] leading-relaxed">
                                      {formatData(part.input)}
                                    </pre>
                                  </div>
                                )}

                                {part.output !== undefined && (
                                  <div className="space-y-1">
                                    <div className="font-medium">Output</div>
                                    <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-background/60 p-2 text-[11px] leading-relaxed">
                                      {formatData(part.output)}
                                    </pre>
                                  </div>
                                )}

                                {part.errorText && (
                                  <div className="text-destructive text-sm">Fehler: {part.errorText}</div>
                                )}
                              </div>
                            </ChainOfThoughtStep>
                          )
                        })}
                      </ChainOfThoughtContent>
                    </ChainOfThought>
                  </div>
                ) : null

              return (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    {chainOfThoughtBlock}

                    {(() => {
                      const hasChartTool = toolParts.some(part => 
                        ['singleStockAnalysis', 'performanceOverview', 'barChart', 'pieChart', 'lineChart', 'categoryTimeseries'].includes(getToolName(part))
                      )

                      return (
                        <>
                          {toolParts.map((part, index) => {
                            const toolName = getToolName(part)
                            
                            if (toolName === 'singleStockAnalysis' && part.state === 'output-available' && part.output) {
                        return (
                          <div key={`${message.id}-chart-${index}`} className="mb-4">
                            <StockAnalysisChart data={part.output as StockAnalysis} />
                          </div>
                        )
                      }
                      if (toolName === 'performanceOverview' && part.state === 'output-available' && part.output) {
                        return (
                          <div key={`${message.id}-chart-${index}`} className="mb-4">
                            <PerformanceOverviewCharts data={part.output as PerformanceOverview} />
                          </div>
                        )
                      }
                      if (toolName === 'barChart' && part.state === 'output-available' && part.output) {
                        return (
                          <div key={`${message.id}-barchart-${index}`} className="mb-4">
                            <BarChartDisplay data={part.output as BarChartData} />
                          </div>
                        )
                      }
                      if (toolName === 'pieChart' && part.state === 'output-available' && part.output) {
                        return (
                          <div key={`${message.id}-piechart-${index}`} className="mb-4">
                            <PieChartDisplay data={part.output as PieChartData} />
                          </div>
                        )
                      }
                      if (toolName === 'lineChart' && part.state === 'output-available' && part.output) {
                        return (
                          <div key={`${message.id}-linechart-${index}`} className="mb-4">
                            <LineChartDisplay data={part.output as LineChartData} />
                          </div>
                        )
                      }
                      if (toolName === 'categoryTimeseries' && part.state === 'output-available' && part.output) {
                        const output = part.output as any;
                        if (output?.series) {
                          return (
                            <div key={`${message.id}-timeseries-${index}`} className="mb-4">
                              <LineChartDisplay data={output as LineChartData} />
                            </div>
                          )
                        }
                      }
                      return null
                    })}

                          {message.role === 'assistant' ? (
                            <MessageResponse
                              className={cn(
                                hasChartTool && "[&_img]:hidden [&_.attachment]:hidden"
                              )}
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {convertLatexDelimiters(getTextContent(message))}
                            </MessageResponse>
                          ) : (
                            getTextContent(message)
                          )}
                        </>
                      )
                    })()}
                  </MessageContent>
                </Message>
              )
            })
          )}
          {status === 'streaming' && messages.at(-1)?.role !== 'assistant' && (
            <Message from="assistant">
              <MessageContent>
                <Loader />
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t bg-background p-4 space-y-3 flex flex-col items-center">
        {messages.length === 0 && (
          <div className="flex flex-wrap justify-center gap-2 max-w-2xl w-full">
            {CHAT_SUGGESTIONS.map((suggestion) => (
              <Suggestion
                key={suggestion}
                suggestion={suggestion}
                onClick={(text) => sendMessageWithContext({ text })}
                className="whitespace-nowrap"
              />
            ))}
          </div>
        )}
        <PromptInput
          onSubmit={async ({ text }) => {
            if (text.trim()) {
              await sendMessageWithContext({ text })
            }
          }}
          className="w-full max-w-2xl"
        >
          <PromptInputTextarea placeholder="Type a message..." />
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}

export function Chat() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader />
      </div>
    )
  }

  return <ChatInner />
}
