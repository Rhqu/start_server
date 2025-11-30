import { createFileRoute, Outlet, Link } from '@tanstack/react-router'
import { Settings, Briefcase, Moon, Sun, ChevronDown, ChevronRight, PanelLeftClose, PanelLeft, Plug, Sparkles, LayoutGrid } from 'lucide-react'
import { ChatWrapper } from '@/components/ChatWrapper'
import { useEffect, useState } from 'react'
import { MarketSidebar } from '@/components/market'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// QPLIX Logo as inline SVG to support currentColor
function QplixLogo({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" className={className}>
      <path d="M256 48c-114.9 0-208 93.1-208 208s93.1 208 208 208c45.5 0 87.6-14.6 121.9-39.4l-60.5-60.5c-18.1 11.3-39.4 17.9-61.4 17.9-66.3 0-120-53.7-120-120s53.7-120 120-120 120 53.7 120 120c0 22-5.9 42.6-16.2 60.3l61.2 61.2c24-34 38-75.4 38-120.5 0-114.9-93.1-208-208-208z"/>
      <circle cx="256" cy="256" r="64"/>
      <polygon points="295,295 472,472 400,472 260,332"/>
    </svg>
  )
}

export const Route = createFileRoute('/dashboard')({
  component: RouteComponent,
})

const menuItems = [
  { title: 'Intelligence', to: '/dashboard', icon: Sparkles },
  { title: 'Portfolio', to: '/dashboard/portfolio', icon: Briefcase },
  { title: 'Playground', to: '/dashboard/playground', icon: LayoutGrid },
  { title: 'Connectors', to: '/dashboard/connectors', icon: Plug },
  { title: 'Settings', to: '/dashboard/settings', icon: Settings },
]

function getThemeFromSettings(): string {
  if (typeof window === 'undefined') return 'dark'
  const saved = localStorage.getItem('app-settings')
  if (saved) {
    const settings = JSON.parse(saved)
    return settings.theme || 'dark'
  }
  return localStorage.getItem('theme') || 'dark'
}

function LeftSidebarFooter({ onCollapse }: { onCollapse: () => void }) {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const initialTheme = getThemeFromSettings()
    setTheme(initialTheme)
    applyTheme(initialTheme)
    
    // Listen for settings changes
    const handleSettingsChange = (e: CustomEvent) => {
      if (e.detail?.theme) {
        setTheme(e.detail.theme)
        applyTheme(e.detail.theme)
      }
    }
    window.addEventListener('settings-changed', handleSettingsChange as EventListener)
    return () => window.removeEventListener('settings-changed', handleSettingsChange as EventListener)
  }, [])

  const applyTheme = (t: string) => {
    if (t === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', prefersDark)
    } else {
      document.documentElement.classList.toggle('dark', t === 'dark')
    }
  }

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    
    // Update both localStorage entries
    localStorage.setItem('theme', newTheme)
    const saved = localStorage.getItem('app-settings')
    const settings = saved ? JSON.parse(saved) : {}
    settings.theme = newTheme
    localStorage.setItem('app-settings', JSON.stringify(settings))
    
    applyTheme(newTheme)
    window.dispatchEvent(new CustomEvent('settings-changed', { detail: settings }))
  }

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <div className="p-3 border-t border-border/50 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-colors" title="Toggle theme">
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <Link to="/dashboard/settings" className="p-2 rounded-lg hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-colors" title="Settings">
          <Settings className="size-4" />
        </Link>
      </div>
      <button onClick={onCollapse} className="p-2 rounded-lg hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-colors" title="Collapse sidebar">
        <PanelLeftClose className="size-4" />
      </button>
    </div>
  )
}

function RouteComponent() {
  const [navOpen, setNavOpen] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  return (
    <ChatWrapper>
      {/* Collapsed sidebar bar */}
      {!sidebarOpen && (
        <TooltipProvider>
          <div className="w-14 shrink-0 border-r bg-sidebar/50 backdrop-blur-sm flex flex-col h-full transition-all duration-200 print:hidden">
            {/* Logo at top */}
            <div className="p-3 border-b flex justify-center">
              <QplixLogo className="size-6" />
            </div>
            
            {/* Top: Navigation icons */}
            <div className="flex-1 flex flex-col items-center py-3 gap-1">
              {/* Icon-only navigation */}
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.to}
                        className="p-2.5 rounded-lg hover:bg-accent/80 transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Icon className="size-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.title}</TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
            
            {/* Bottom: Expand button */}
            <div className="p-3 border-t flex justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 rounded-lg hover:bg-accent/80 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <PanelLeft className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sidebar öffnen</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      )}
      
      {/* Full sidebar */}
      {sidebarOpen && (
        <aside className="w-72 border-r bg-sidebar/50 backdrop-blur-sm shrink-0 flex flex-col h-full overflow-hidden transition-all duration-200 print:hidden">
          {/* Logo Header */}
          <div className="p-4 border-b flex items-center gap-3">
            <QplixLogo className="size-7" />
            <span className="font-semibold text-lg tracking-tight">QPLIX</span>
          </div>
          
          <ScrollArea className="flex-1 h-0">
            <div className="p-3">
              {/* Collapsible Navigation */}
              <Collapsible open={navOpen} onOpenChange={setNavOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent/50">
                  <span className="uppercase tracking-wider">Navigation</span>
                  {navOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <nav className="flex flex-col gap-0.5 mt-2">
                    {menuItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link key={item.to} to={item.to} className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-colors">
                          <Icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      )
                    })}
                  </nav>
                </CollapsibleContent>
              </Collapsible>
              
              {/* Divider */}
              <div className="h-px bg-border/50 my-4" />
              
              {/* Market Sidebar */}
              <MarketSidebar />
            </div>
          </ScrollArea>
          <LeftSidebarFooter onCollapse={() => setSidebarOpen(false)} />
        </aside>
      )}
      
      <div className="flex-1 flex flex-col min-w-0 overflow-auto scrollbar-hide transition-all duration-200">
        <div className="flex flex-1 flex-col gap-4 p-2 sm:p-4">
          <Outlet />
        </div>
      </div>
    </ChatWrapper>
  )
}
