import { nanoid } from 'nanoid'
import { BarChartData, PieChartData, LineChartData } from './schemas/charts'

export interface PlaygroundChart {
  id: string
  type: 'bar' | 'pie' | 'line'
  data: BarChartData | PieChartData | LineChartData
  position: number
  addedAt: number
  size: 1 | 2  // 1 = 33% width, 2 = 66% width
}

interface PlaygroundState {
  charts: PlaygroundChart[]
}

const STORAGE_KEY = 'playground-charts'

export function getPlaygroundCharts(): PlaygroundChart[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []
  try {
    const state: PlaygroundState = JSON.parse(stored)
    return state.charts.sort((a, b) => a.position - b.position)
  } catch {
    return []
  }
}

export function addChartToPlayground(
  type: 'bar' | 'pie' | 'line',
  data: BarChartData | PieChartData | LineChartData
): PlaygroundChart {
  const charts = getPlaygroundCharts()
  const newChart: PlaygroundChart = {
    id: nanoid(),
    type,
    data,
    position: charts.length,
    addedAt: Date.now(),
    size: 1,  // Default to 1x size (33% width)
  }
  const updatedCharts = [...charts, newChart]
  saveCharts(updatedCharts)
  return newChart
}

export function removeChartFromPlayground(id: string): void {
  const charts = getPlaygroundCharts().filter(c => c.id !== id)
  saveCharts(charts)
}

export function reorderPlaygroundCharts(chartIds: string[]): void {
  const charts = getPlaygroundCharts()
  const reordered = chartIds.map((id, index) => {
    const chart = charts.find(c => c.id === id)!
    return { ...chart, position: index }
  })
  saveCharts(reordered)
}

export function toggleChartSize(id: string): void {
  const charts = getPlaygroundCharts()
  const updatedCharts = charts.map(chart =>
    chart.id === id
      ? { ...chart, size: (chart.size === 1 ? 2 : 1) as 1 | 2 }
      : chart
  )
  saveCharts(updatedCharts)
}

export function clearPlayground(): void {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event('playground-updated'))
}

function saveCharts(charts: PlaygroundChart[]): void {
  const state: PlaygroundState = { charts }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new Event('playground-updated'))
}
