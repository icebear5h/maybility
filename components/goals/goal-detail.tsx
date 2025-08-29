"use client"
import { GoalHeader } from "./goal-header"
import { useGoal } from "@/hooks/use-goal"
import { Skeleton } from "@/components/ui/skeleton"
import { KanbanBoard } from "./kanban-board"

interface GoalDetailProps {
  goalId: string
}

export function GoalDetail({ goalId }: GoalDetailProps) {
  const { goal, isLoading, refetch } = useGoal(goalId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-muted-foreground">Goal not found</h1>
        <p className="text-muted-foreground mt-2">
          The goal you're looking for doesn't exist or you don't have access to it.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <GoalHeader goal={goal} onRefetch={refetch} />
      <KanbanBoard goal={goal} onRefetch={refetch} />
    </div>
  )
}
