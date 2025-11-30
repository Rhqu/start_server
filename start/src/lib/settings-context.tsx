"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

// =============================================================================
// TYPES
// =============================================================================

export interface Settings {
  theme: string;
  language: "de" | "en";
  currency: "EUR" | "USD" | "CHF";
  autoRefresh: boolean;
  refreshInterval: string;
  showPercentageChange: boolean;
}

interface SettingsContextType {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  t: (key: string) => string;
  formatCurrency: (val: number | null) => string;
  formatPercent: (val: number | null) => string;
}

// =============================================================================
// DEFAULT SETTINGS
// =============================================================================

export const defaultSettings: Settings = {
  theme: "dark",
  language: "de",
  currency: "EUR",
  autoRefresh: true,
  refreshInterval: "30",
  showPercentageChange: true,
};

// =============================================================================
// CURRENCY EXCHANGE RATES (relative to EUR)
// =============================================================================

const exchangeRates: Record<string, number> = {
  EUR: 1,
  USD: 1.08, // 1 EUR = 1.08 USD
  CHF: 0.94, // 1 EUR = 0.94 CHF
};

// =============================================================================
// TRANSLATIONS
// =============================================================================

export const translations = {
  de: {
    // Settings Page
    settings: "Einstellungen",
    manageSettings: "App-Einstellungen verwalten",
    reset: "Zurücksetzen",
    appearance: "Darstellung",
    appearanceDesc: "Aussehen der App anpassen",
    theme: "Theme",
    themeDesc: "Hell, Dunkel oder System",
    light: "Hell",
    dark: "Dunkel",
    system: "System",
    languageRegion: "Sprache & Region",
    languageRegionDesc: "Sprache und Währung einstellen",
    language: "Sprache",
    languageDesc: "Anzeigesprache wählen",
    currency: "Währung",
    currencyDesc: "Standardwährung für Preise",
    dataDisplay: "Daten & Anzeige",
    dataDisplayDesc: "Aktualisierung und Anzeige-Optionen",
    autoRefresh: "Auto-Aktualisierung",
    autoRefreshDesc: "Marktdaten automatisch aktualisieren",
    refreshInterval: "Aktualisierungsintervall",
    refreshIntervalDesc: "Wie oft Daten aktualisiert werden",
    seconds10: "10 Sekunden",
    seconds30: "30 Sekunden",
    minute1: "1 Minute",
    showPercent: "Prozent anzeigen",
    showPercentDesc: "Änderungen in % anzeigen",
    
    // Dashboard
    dashboard: "Dashboard",
    overview: "Übersicht",
    portfolio: "Portfolio",
    market: "Markt",
    
    // Portfolio
    totalPortfolio: "Gesamtportfolio",
    familySmith: "Familie Schmidt",
    totalValue: "Gesamtwert",
    performance: "Performance",
    twr: "TWR",
    irr: "IRR",
    cashFlow: "Cash Flow",
    assetAllocation: "Asset Allocation",
    clickCategoryDetails: "Klicken Sie auf eine Kategorie für Details",
    clearSelection: "Auswahl aufheben",
    all: "Alle",
    liquid: "Liquide",
    illiquid: "Illiquide",
    liquidAssets: "Liquide Anlagen",
    illiquidAssets: "Illiquide Anlagen",
    assetsInCategory: "Anlagen in",
    asset: "Anlage",
    value: "Wert",
    share: "Anteil",
    noAssetsInCategory: "Keine Anlagen in dieser Kategorie",
    performanceOverview: "Performance Übersicht",
    byLiquidityType: "Nach Liquiditätstyp",
    
    // Cash Flow
    inflows: "Zuflüsse",
    outflows: "Abflüsse",
    net: "Netto",
    inflow: "Zufluss",
    outflow: "Abfluss",
    noMovements: "Keine Bewegungen",
    netInflow: "Netto-Zufluss",
    netOutflow: "Netto-Abfluss",
    capitalFlows: "Kapitalzu- und -abflüsse im Portfolio",
    totalInflowMore: "Insgesamt fließt",
    intoPortfolio: "mehr ins Portfolio als heraus.",
    outOfPortfolio: "mehr aus dem Portfolio als hinein.",
    
    // Performance
    category: "Kategorie",
    currentValue: "Aktueller Wert",
    
    // Actions
    export: "Export",
    refresh: "Aktualisieren",
    
    // Sidebar
    home: "Startseite",
    watchlist: "Beobachtungsliste",
    winners: "Gewinner",
    losers: "Verlierer",
  },
  en: {
    // Settings Page
    settings: "Settings",
    manageSettings: "Manage app settings",
    reset: "Reset",
    appearance: "Appearance",
    appearanceDesc: "Customize the app appearance",
    theme: "Theme",
    themeDesc: "Light, Dark or System",
    light: "Light",
    dark: "Dark",
    system: "System",
    languageRegion: "Language & Region",
    languageRegionDesc: "Set language and currency",
    language: "Language",
    languageDesc: "Choose display language",
    currency: "Currency",
    currencyDesc: "Default currency for prices",
    dataDisplay: "Data & Display",
    dataDisplayDesc: "Refresh and display options",
    autoRefresh: "Auto Refresh",
    autoRefreshDesc: "Automatically refresh market data",
    refreshInterval: "Refresh Interval",
    refreshIntervalDesc: "How often data is refreshed",
    seconds10: "10 Seconds",
    seconds30: "30 Seconds",
    minute1: "1 Minute",
    showPercent: "Show Percentage",
    showPercentDesc: "Show changes in %",
    
    // Dashboard
    dashboard: "Dashboard",
    overview: "Overview",
    portfolio: "Portfolio",
    market: "Market",
    
    // Portfolio
    totalPortfolio: "Total Portfolio",
    familySmith: "Smith Family",
    totalValue: "Total Value",
    performance: "Performance",
    twr: "TWR",
    irr: "IRR",
    cashFlow: "Cash Flow",
    assetAllocation: "Asset Allocation",
    clickCategoryDetails: "Click on a category for details",
    clearSelection: "Clear selection",
    all: "All",
    liquid: "Liquid",
    illiquid: "Illiquid",
    liquidAssets: "Liquid Assets",
    illiquidAssets: "Illiquid Assets",
    assetsInCategory: "Assets in",
    asset: "Asset",
    value: "Value",
    share: "Share",
    noAssetsInCategory: "No assets in this category",
    performanceOverview: "Performance Overview",
    byLiquidityType: "By Liquidity Type",
    
    // Cash Flow
    inflows: "Inflows",
    outflows: "Outflows",
    net: "Net",
    inflow: "Inflow",
    outflow: "Outflow",
    noMovements: "No movements",
    netInflow: "Net Inflow",
    netOutflow: "Net Outflow",
    capitalFlows: "Capital flows in the portfolio",
    totalInflowMore: "Overall,",
    intoPortfolio: "more flows into the portfolio than out.",
    outOfPortfolio: "more flows out of the portfolio than in.",
    
    // Performance
    category: "Category",
    currentValue: "Current Value",
    
    // Actions
    export: "Export",
    refresh: "Refresh",
    
    // Sidebar
    home: "Home",
    watchlist: "Watchlist",
    winners: "Winners",
    losers: "Losers",
  },
};

// =============================================================================
// CONTEXT
// =============================================================================

const SettingsContext = createContext<SettingsContextType | null>(null);

// =============================================================================
// HELPER: Get settings from localStorage
// =============================================================================

export function getStoredSettings(): Settings {
  if (typeof window === "undefined") return defaultSettings;
  const saved = localStorage.getItem("app-settings");
  return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
}

// =============================================================================
// PROVIDER
// =============================================================================

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => getStoredSettings());

  // Listen for settings changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "app-settings" && e.newValue) {
        setSettings({ ...defaultSettings, ...JSON.parse(e.newValue) });
      }
    };

    const handleSettingsChanged = (e: CustomEvent<Settings>) => {
      setSettings(e.detail);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("settings-changed", handleSettingsChanged as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("settings-changed", handleSettingsChanged as EventListener);
    };
  }, []);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: value };
      localStorage.setItem("app-settings", JSON.stringify(newSettings));
      window.dispatchEvent(new CustomEvent("settings-changed", { detail: newSettings }));
      return newSettings;
    });
  }, []);

  // Translation function
  const t = useCallback(
    (key: string): string => {
      const lang = settings.language as keyof typeof translations;
      const dict = translations[lang] || translations.de;
      return (dict as Record<string, string>)[key] || key;
    },
    [settings.language]
  );

  // Currency formatting with conversion
  const formatCurrency = useCallback(
    (val: number | null): string => {
      if (val === null) return "—";
      
      // Convert from EUR to selected currency
      const rate = exchangeRates[settings.currency] || 1;
      const convertedValue = val * rate;
      
      const locale = settings.language === "de" ? "de-DE" : "en-US";
      
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: settings.currency,
        maximumFractionDigits: 0,
      }).format(convertedValue);
    },
    [settings.currency, settings.language]
  );

  // Percent formatting
  const formatPercent = useCallback(
    (val: number | null): string => {
      if (val === null) return "—";
      const locale = settings.language === "de" ? "de-DE" : "en-US";
      return new Intl.NumberFormat(locale, {
        style: "percent",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val);
    },
    [settings.language]
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSetting,
        t,
        formatCurrency,
        formatPercent,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

// =============================================================================
// STANDALONE FUNCTIONS (for components outside provider)
// =============================================================================

export function getFormatCurrency(currency: string = "EUR", language: string = "de") {
  return (val: number | null): string => {
    if (val === null) return "—";
    const rate = exchangeRates[currency] || 1;
    const convertedValue = val * rate;
    const locale = language === "de" ? "de-DE" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(convertedValue);
  };
}

export function getFormatPercent(language: string = "de") {
  return (val: number | null): string => {
    if (val === null) return "—";
    const locale = language === "de" ? "de-DE" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };
}
