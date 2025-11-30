import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { 
  Palette, 
  Globe, 
  RotateCcw,
  RefreshCw
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useSettings, defaultSettings, translations } from '@/lib/settings-context'

export const Route = createFileRoute('/dashboard/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { settings, updateSetting } = useSettings()
  
  // Get language-specific translations for settings page
  const t = translations[settings.language as keyof typeof translations] || translations.de

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  const applyTheme = (theme: string) => {
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', prefersDark)
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
    localStorage.setItem('theme', theme)
  }

  const resetToDefaults = () => {
    Object.entries(defaultSettings).forEach(([key, value]) => {
      updateSetting(key as keyof typeof defaultSettings, value as never)
    })
    applyTheme(defaultSettings.theme)
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.settings}</h1>
          <p className="text-muted-foreground text-sm">{t.manageSettings}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={resetToDefaults}
          className="gap-2"
        >
          <RotateCcw className="size-4" />
          {t.reset}
        </Button>
      </div>

      {/* Appearance Settings */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Palette className="size-5 text-primary" />
            <CardTitle className="text-lg">{t.appearance}</CardTitle>
          </div>
          <CardDescription>{t.appearanceDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingRow 
            label={t.theme}
            description={t.themeDesc}
          >
            <Select 
              value={settings.theme} 
              onValueChange={(v) => {
                updateSetting('theme', v)
                applyTheme(v)
              }}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t.light}</SelectItem>
                <SelectItem value="dark">{t.dark}</SelectItem>
                <SelectItem value="system">{t.system}</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </CardContent>
      </Card>

      {/* Language & Region */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Globe className="size-5 text-primary" />
            <CardTitle className="text-lg">{t.languageRegion}</CardTitle>
          </div>
          <CardDescription>{t.languageRegionDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingRow 
            label={t.language}
            description={t.languageDesc}
          >
            <Select value={settings.language} onValueChange={(v: "de" | "en") => updateSetting('language', v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          
          <Separator />
          
          <SettingRow 
            label={t.currency}
            description={t.currencyDesc}
          >
            <Select value={settings.currency} onValueChange={(v: "EUR" | "USD" | "CHF") => updateSetting('currency', v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">Euro (€)</SelectItem>
                <SelectItem value="USD">Dollar ($)</SelectItem>
                <SelectItem value="CHF">Franken (CHF)</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </CardContent>
      </Card>

      {/* Data & Display */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="size-5 text-primary" />
            <CardTitle className="text-lg">{t.dataDisplay}</CardTitle>
          </div>
          <CardDescription>{t.dataDisplayDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingRow 
            label={t.autoRefresh}
            description={t.autoRefreshDesc}
          >
            <Switch 
              checked={settings.autoRefresh} 
              onCheckedChange={(v) => updateSetting('autoRefresh', v)} 
            />
          </SettingRow>
          
          <Separator />
          
          <SettingRow 
            label={t.refreshInterval}
            description={t.refreshIntervalDesc}
          >
            <Select 
              value={settings.refreshInterval} 
              onValueChange={(v) => updateSetting('refreshInterval', v)}
              disabled={!settings.autoRefresh}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">{t.seconds10}</SelectItem>
                <SelectItem value="30">{t.seconds30}</SelectItem>
                <SelectItem value="60">{t.minute1}</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          
          <Separator />
          
          <SettingRow 
            label={t.showPercent}
            description={t.showPercentDesc}
          >
            <Switch 
              checked={settings.showPercentageChange} 
              onCheckedChange={(v) => updateSetting('showPercentageChange', v)} 
            />
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper component for setting rows
function SettingRow({ 
  label, 
  description, 
  children 
}: { 
  label: string
  description: string
  children: React.ReactNode 
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">
        {children}
      </div>
    </div>
  )
}
