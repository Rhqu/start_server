import { useState, useMemo, useEffect } from "react"
import { TrendingUp, TrendingDown, Activity, ChevronDown, ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { usePortfolio } from "@/components/portfolio"

// Settings helper
function getSettings() {
  const defaults = {
    currency: 'EUR',
    showPercentageChange: true,
    language: 'de',
  }
  if (typeof window === 'undefined') return defaults
  const saved = localStorage.getItem('app-settings')
  return saved ? { ...defaults, ...JSON.parse(saved) } : defaults
}

function getCurrencySymbol(currency: string) {
  switch (currency) {
    case 'USD': return '$'
    case 'EUR': return '€'
    case 'CHF': return 'CHF'
    default: return '€'
  }
}

// Exchange rates (EUR as base currency - prices are stored in USD, we convert from USD)
const exchangeRates: Record<string, number> = {
  USD: 1,
  EUR: 0.94,
  CHF: 0.88,
}

function convertPrice(priceInUSD: number, toCurrency: string): number {
  const rate = exchangeRates[toCurrency] || 1
  return priceInUSD * rate
}

// Translations for market sidebar
const marketTranslations = {
  de: {
    market: 'Markt',
    topPositions: 'Top Positionen',
    winners: 'Gewinner',
    losers: 'Verlierer',
    active: 'Aktiv',
    noPositions: 'Keine Positionen',
    noData: 'Keine Daten',
  },
  en: {
    market: 'Market',
    topPositions: 'Top Positions',
    winners: 'Winners',
    losers: 'Losers',
    active: 'Active',
    noPositions: 'No positions',
    noData: 'No data',
  }
}

// Types
interface Stock {
  symbol: string
  change: number
  investment: number
  domain?: string
}

// Guess domain from company name
function guessDomain(name: string): string | undefined {
  const first = name.split(" ")[0]?.toLowerCase()
  if (!first) return undefined
  const known: Record<string, string> = {
    microsoft: "microsoft.com",
    nvidia: "nvidia.com",
    apple: "apple.com",
    google: "google.com",
    alphabet: "google.com",
    amazon: "amazon.com",
    meta: "meta.com",
    tesla: "tesla.com",
    hugo: "hugoboss.com",
    deutsche: "db.com",
    honda: "honda.com",
    vodafone: "vodafone.com",
    kraft: "kraftheinzcompany.com",
    sodexo: "sodexo.com",
    accesso: "accesso.com",
  }
  return known[first] || `${first}.com`
}

// Helper to map Asset to Stock display format
function assetToStock(a: { name: string; twr: number | null; externalFlow: number | null }): Stock {
  return {
    symbol: a.name.split(" ")[0] || a.name,
    change: (a.twr ?? 0) * 100,
    investment: Math.abs(a.externalFlow ?? 0),
    domain: guessDomain(a.name),
  }
}

const formatCompact = (n: number, currency: string) => {
  const symbol = getCurrencySymbol(currency)
  const converted = convertPrice(n, currency)
  if (converted >= 1_000_000) return `${(converted / 1_000_000).toFixed(1)}M ${symbol}`
  if (converted >= 1_000) return `${(converted / 1_000).toFixed(0)}K ${symbol}`
  return `${converted.toFixed(0)} ${symbol}`
}

// Stock logo with fallback
function StockLogo({ symbol, domain }: { symbol: string; domain?: string }) {
  const [error, setError] = useState(false)
  const logoUrl = domain ? `https://unavatar.io/${domain}?fallback=false` : null

  if (error || !logoUrl) {
    return (
      <div className="w-5 h-5 rounded bg-accent/70 flex items-center justify-center text-[10px] shrink-0">
        {symbol[0]}
      </div>
    )
  }

  return (
    <img
      src={logoUrl}
      alt={symbol}
      className="w-5 h-5 rounded shrink-0 object-contain"
      onError={() => setError(true)}
    />
  )
}

// Stock Item Component
function StockItem({ stock, settings }: { stock: Stock; settings: { currency: string; showPercentageChange: boolean; language: string } }) {
  const isPositive = stock.change >= 0

  return (
    <div className="flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-accent/50 cursor-pointer transition-colors">
      <div className="flex items-center gap-1.5">
        <StockLogo symbol={stock.symbol} domain={stock.domain} />
        <div className="flex flex-col">
          <span className="text-xs font-medium">{stock.symbol}</span>
          <span className="text-[10px] text-muted-foreground">{formatCompact(stock.investment, settings.currency)}</span>
        </div>
      </div>
      {settings.showPercentageChange && (
        <span className={cn(
          "text-xs font-medium",
          isPositive ? "text-emerald-600/90" : "text-[#b22222]/90"
        )}>
          {isPositive ? "+" : ""}{stock.change.toFixed(1)}%
        </span>
      )}
    </div>
  )
}

// Tab Button Component
function TabButton({ 
  active, 
  onClick, 
  children, 
  icon: Icon 
}: { 
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-0.5 px-2 py-1 text-[11px] font-medium rounded transition-colors",
        active 
          ? "bg-accent text-foreground" 
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      )}
    >
      {Icon && <Icon className="size-3" />}
      {children}
    </button>
  )
}

// Default settings
const defaultSettings = {
  currency: 'EUR',
  showPercentageChange: true,
  language: 'de',
}

// Main Market Sidebar Component
export function MarketSidebar({ className }: { className?: string }) {
  const [activeTab, setActiveTab] = useState<"winners" | "losers" | "active">("winners")
  const [isExpanded, setIsExpanded] = useState(true)
  const [settings, setSettings] = useState(defaultSettings)
  const { data: portfolio, isLoading, isError } = usePortfolio()

  const t = marketTranslations[settings.language as keyof typeof marketTranslations] || marketTranslations.de

  // Load settings on mount and listen for changes
  useEffect(() => {
    setSettings(getSettings())
    const handleSettingsChange = () => {
      setSettings(getSettings())
    }
    window.addEventListener('settings-changed', handleSettingsChange)
    return () => window.removeEventListener('settings-changed', handleSettingsChange)
  }, [])

  // Get all individual stocks from portfolio
  const allStocks = useMemo(() => {
    if (!portfolio) return []
    return portfolio["Liquid assets"]?.["Stocks"]?.["Individual stocks"]?.subLines ?? []
  }, [portfolio])

  // Top 5 positions by invested amount
  const topPositions = useMemo(() => {
    return [...allStocks]
      .filter(a => a.externalFlow !== null)
      .sort((a, b) => Math.abs(b.externalFlow ?? 0) - Math.abs(a.externalFlow ?? 0))
      .slice(0, 5)
      .map(assetToStock)
  }, [allStocks])

  // Winners: highest TWR
  const winners = useMemo(() => {
    return [...allStocks]
      .filter(a => a.twr !== null)
      .sort((a, b) => (b.twr ?? 0) - (a.twr ?? 0))
      .slice(0, 4)
      .map(assetToStock)
  }, [allStocks])

  // Losers: lowest TWR
  const losers = useMemo(() => {
    return [...allStocks]
      .filter(a => a.twr !== null)
      .sort((a, b) => (a.twr ?? 0) - (b.twr ?? 0))
      .slice(0, 4)
      .map(assetToStock)
  }, [allStocks])

  // Active: biggest absolute performance
  const active = useMemo(() => {
    return [...allStocks]
      .filter(a => a.totalPerformance !== null)
      .sort((a, b) => Math.abs(b.totalPerformance ?? 0) - Math.abs(a.totalPerformance ?? 0))
      .slice(0, 4)
      .map(assetToStock)
  }, [allStocks])

  const getTabData = () => {
    switch (activeTab) {
      case "winners": return winners
      case "losers": return losers
      case "active": return active
    }
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <span>{t.market}</span>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-2 mt-0.5">
          {/* Top Positions Section */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-1.5 mb-0.5">
              <span className="text-[10px] font-medium text-muted-foreground">{t.topPositions}</span>
            </div>
            <div className="flex flex-col">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : isError ? (
                <div className="text-xs text-muted-foreground px-1.5 py-2">Unable to load portfolio data</div>
              ) : topPositions.length > 0 ? (
                topPositions.map((stock) => (
                  <StockItem key={stock.symbol} stock={stock} settings={settings} />
                ))
              ) : (
                <div className="text-xs text-muted-foreground px-1.5 py-2">{t.noPositions}</div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border mx-2" />

          {/* Winners/Losers/Active Tabs */}
          <div className="flex flex-col">
            <div className="flex items-center gap-0.5 px-1.5 mb-1">
              <TabButton
                active={activeTab === "winners"}
                onClick={() => setActiveTab("winners")}
                icon={TrendingUp}
              >
                {t.winners}
              </TabButton>
              <TabButton
                active={activeTab === "losers"}
                onClick={() => setActiveTab("losers")}
                icon={TrendingDown}
              >
                {t.losers}
              </TabButton>
              <TabButton
                active={activeTab === "active"}
                onClick={() => setActiveTab("active")}
                icon={Activity}
              >
                {t.active}
              </TabButton>
            </div>
            <div className="flex flex-col">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : isError ? (
                <div className="text-xs text-muted-foreground px-1.5 py-2">Unable to load data</div>
              ) : getTabData().length > 0 ? (
                getTabData().map((stock) => (
                  <StockItem key={stock.symbol} stock={stock} settings={settings} />
                ))
              ) : (
                <div className="text-xs text-muted-foreground px-1.5 py-2">{t.noData}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Compact version for narrow sidebars
export function MarketSidebarCompact({ className }: { className?: string }) {
  return (
    <ScrollArea className={cn("h-full", className)}>
      <MarketSidebar />
    </ScrollArea>
  )
}

export default MarketSidebar
