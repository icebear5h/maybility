"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CreateGoalDialog } from "./create-goal-dialog"
import { GoalCard } from "./goal-card"
import { useGoals } from "@/hooks/use-goals"
import type { Goal } from "@prisma/client"

type GoalWithProgress = Goal & {
  tasks: Array<{ id: string; status: string; dueAt: Date | null; isMilestone: boolean }>
  updates: Array<{ createdAt: Date }>
}

export function GoalsOverview() {
  const [showArchived, setShowArchived] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const { goals, isLoading, refetch } = useGoals({
    archived: showArchived,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant={showArchived ? "outline" : "default"}
            onClick={() => setShowArchived(!showArchived)}
            size="sm"
          >
            {showArchived ? "Show Active" : "Show Archived"}
          </Button>
        </div>

        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {goals && goals.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal: GoalWithProgress) => (
            <GoalCard key={goal.id} goal={goal} onRefetch={refetch} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {showArchived ? "No archived goals found." : "No goals yet. Create your first goal to get started!"}
          </p>
          {!showArchived && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Goal
            </Button>
          )}
        </div>
      )}

      <CreateGoalDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSuccess={() => refetch()} />
    </div>
  )
}
