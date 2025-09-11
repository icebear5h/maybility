"use client"

import { useParams } from "next/navigation"
import { GoalDetail } from "@/components/goals/goal-detail"
import { LayoutWrapper } from "@/components/navbar/layout-wrapper"

export default function GoalDetailPage() {
  const params = useParams()
  const goalId = params.id as string

  return (
    <LayoutWrapper>
      <GoalDetail goalId={goalId} />
    </LayoutWrapper>
  )
}
