"use client"

import { Badge } from "@/components/ui/badge"
import { Calendar, CheckCircle, Circle } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { Goal, GoalTask } from "@prisma/client"

type GoalWithDetails = Goal & {
  tasks: GoalTask[]
}

interface RoadmapTabProps {
  goal: GoalWithDetails
}

export function RoadmapTab({ goal }: RoadmapTabProps) {
  const milestones = goal.tasks.filter((task) => task.isMilestone)
  const doneMilestones = milestones.filter((task) => task.status === "DONE")
  const upcomingMilestones = milestones
    .filter((task) => task.status === "TODO" && task.dueAt)
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
  const unscheduledMilestones = milestones.filter((task) => task.status === "TODO" && !task.dueAt)

  if (milestones.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No milestones defined yet.</p>
        <p className="text-sm mt-1">Add milestone tasks to see your roadmap timeline.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Completed Milestones */}
      {doneMilestones.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Completed Milestones
          </h3>
          <div className="space-y-3">
            {doneMilestones.map((milestone) => (
              <MilestoneItem key={milestone.id} milestone={milestone} completed />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Milestones */}
      {upcomingMilestones.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Circle className="h-4 w-4" />
            Upcoming Milestones
          </h3>
          <div className="space-y-3">
            {upcomingMilestones.map((milestone, index) => (
              <div key={milestone.id} className="relative">
                {index < upcomingMilestones.length - 1 && <div className="absolute left-6 top-12 w-px h-8 bg-border" />}
                <MilestoneItem milestone={milestone} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unscheduled Milestones */}
      {unscheduledMilestones.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Unscheduled Milestones
          </h3>
          <div className="space-y-3">
            {unscheduledMilestones.map((milestone) => (
              <MilestoneItem key={milestone.id} milestone={milestone} unscheduled />
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/calendar?goalId=${goal.id}`}>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule in Calendar
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface MilestoneItemProps {
  milestone: GoalTask
  completed?: boolean
  unscheduled?: boolean
}

function MilestoneItem({ milestone, completed = false, unscheduled = false }: MilestoneItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      <div className="mt-1">
        {completed ? (
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className={completed ? "line-through text-muted-foreground" : "font-medium"}>{milestone.title}</span>
          <Badge variant="secondary">Milestone</Badge>
        </div>
        {milestone.dueAt && (
          <div className="text-sm text-muted-foreground">
            {completed
              ? `Completed ${formatDistanceToNow(new Date(milestone.updatedAt), { addSuffix: true })}`
              : `Due ${format(new Date(milestone.dueAt), "MMM d, yyyy")} (${formatDistanceToNow(new Date(milestone.dueAt), { addSuffix: true })})`}
          </div>
        )}
        {unscheduled && <div className="text-sm text-muted-foreground">No due date set</div>}
      </div>
    </div>
  )
}
