"use client"
import { GoalsOverview } from "@/components/goals/goals-overview"
import { LayoutWrapper } from "@/components/navbar/layout-wrapper"

export default function GoalsPage() {
  return (
    <LayoutWrapper>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
        <p className="text-muted-foreground mt-2">
          Organize your aspirations across time horizons and track progress toward meaningful outcomes.
        </p>
      </div>
      <GoalsOverview />
    </LayoutWrapper>
  )
}
