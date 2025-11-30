import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PortfolioCompositionChart } from '@/components/portfolio/portfolio-composition-chart'
import { PortfolioTable } from '@/components/portfolio'


export const Route = createFileRoute('/dashboard/overview')({
    component: RouteComponent,
})

function RouteComponent() {
    const [searchQuery, setSearchQuery] = useState("")

    return (
        <div className="container max-w-6xl py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
                <p className="text-muted-foreground">
                    Your portfolio distribution and performance at a glance.
                </p>
            </div>

            <PortfolioCompositionChart
                selectedCategory={searchQuery}
                onSelectCategory={(category) => setSearchQuery(category || "")}
            />
            <PortfolioTable
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />
        </div>
    )
}
