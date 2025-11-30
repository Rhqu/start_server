'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import * as PlaygroundStore from '@/lib/playground-store'
import type { PlaygroundChart } from '@/lib/playground-store'
import type { BarChartData, PieChartData, LineChartData } from '@/lib/schemas/charts'

export function usePlayground() {
  const [charts, setCharts] = useState<PlaygroundChart[]>([])
  const navigate = useNavigate()

  // Load charts on mount and listen for updates
  useEffect(() => {
    const loadCharts = () => setCharts(PlaygroundStore.getPlaygroundCharts())
    loadCharts()

    window.addEventListener('playground-updated', loadCharts)
    return () => window.removeEventListener('playground-updated', loadCharts)
  }, [])

  const addChart = useCallback((type: 'bar' | 'pie' | 'line', data: BarChartData | PieChartData | LineChartData, autoNavigate = true) => {
    PlaygroundStore.addChartToPlayground(type, data)
    toast.success('Chart added to Playground')
    if (autoNavigate) {
      navigate({ to: '/dashboard/playground' })
    }
  }, [navigate])

  const removeChart = useCallback((id: string) => {
    PlaygroundStore.removeChartFromPlayground(id)
    toast.success('Chart removed')
  }, [])

  const reorderCharts = useCallback((chartIds: string[]) => {
    PlaygroundStore.reorderPlaygroundCharts(chartIds)
  }, [])

  const clearAll = useCallback(() => {
    PlaygroundStore.clearPlayground()
    toast.success('Playground cleared')
  }, [])

  const toggleSize = useCallback((id: string) => {
    PlaygroundStore.toggleChartSize(id)
  }, [])

  return {
    charts,
    addChart,
    removeChart,
    reorderCharts,
    clearAll,
    toggleSize,
  }
}
