"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { MoreHorizontal, Plus, MessageSquare, Calendar, BookOpen } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Goal } from "@prisma/client"

type GoalWithProgress = Goal & {
  tasks: Array<{ id: string; status: string; dueAt: Date | null; isMilestone: boolean }>
  updates: Array<{ createdAt: Date }>
}

interface GoalCardProps {
  goal: GoalWithProgress
  onRefetch: () => void
}

export function GoalCard({ goal, onRefetch }: GoalCardProps) {
  const router = useRouter()

  const completedTasks = goal.tasks.filter((task) => task.status === "DONE").length
  const totalTasks = goal.tasks.length
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const nextDueTask = goal.tasks
    .filter((task) => task.status === "TODO" && task.dueAt)
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())[0]

  const lastUpdate = goal.updates[0]

  const handleDoubleClick = () => {
    router.push(`/goals/${goal.id}`)
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onDoubleClick={handleDoubleClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <CardTitle className="text-lg leading-tight">{goal.title}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/goals/${goal.id}?tab=tasks`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/goals/${goal.id}?tab=updates`}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  New Update
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/calendar?goalId=${goal.id}`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Open in Calendar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/journal?goalTag=${goal.id}`}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Open Goal Notes
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {goal.description && <p className="text-sm text-muted-foreground line-clamp-2">{goal.description}</p>}

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progress</span>
            <span className="text-muted-foreground">
              {completedTasks}/{totalTasks} tasks
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Next Due Task */}
        {nextDueTask && (
          <div className="text-sm">
            <span className="text-muted-foreground">Next due: </span>
            <span className="font-medium">{nextDueTask.title}</span>
            <span className="text-muted-foreground ml-1">
              ({formatDistanceToNow(new Date(nextDueTask.dueAt!), { addSuffix: true })})
            </span>
          </div>
        )}

        {/* Last Update */}
        {lastUpdate && (
          <div className="text-sm text-muted-foreground">
            Last update {formatDistanceToNow(new Date(lastUpdate.createdAt), { addSuffix: true })}
          </div>
        )}

        {/* Target Date */}
        {goal.targetDate && (
          <div className="text-sm text-muted-foreground">Target: {new Date(goal.targetDate).toLocaleDateString()}</div>
        )}
      </CardContent>
    </Card>
  )
}
