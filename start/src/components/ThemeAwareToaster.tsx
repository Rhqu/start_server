'use client'

import { Toaster } from 'sonner'
import { useSettings } from '@/lib/settings-context'

export function ThemeAwareToaster() {
  const { settings } = useSettings()

  return (
    <Toaster
      position="bottom-right"
      theme={settings.theme as 'light' | 'dark' | 'system'}
      richColors
    />
  )
}
