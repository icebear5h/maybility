"use client"

import { useState } from "react"
import type { Goal, Task, JournalEntry, Stage } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Target,
  Plus,
  Calendar,
  ChevronRight,
  MoreHorizontal,
  Play,
  CheckCircle2,
  Circle,
  ArrowRight,
  FileText,
  ListTodo,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface GoalsViewProps {
  goals: Goal[]
  tasks: Task[]
  entries: JournalEntry[]
  onCreateGoal: () => void
  onEditGoal: (goal: Goal) => void
  onUpdateGoal: (goal: Goal) => void
  onDeleteGoal: (goal: Goal) => void
}

type GoalsSubMode = "overview" | "five-year" | "detail"

const categoryColors: Record<Goal["category"], string> = {
  career: "#6366f1",
  health: "#22c55e",
  financial: "#eab308",
  personal: "#ec4899",
  education: "#3b82f6",
  relationships: "#f97316",
}

export function GoalsView({
  goals,
  tasks,
  entries,
  onCreateGoal,
  onEditGoal,
  onUpdateGoal,
  onDeleteGoal,
}: GoalsViewProps) {
  const [subMode, setSubMode] = useState<GoalsSubMode>("overview")
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)

  const handleSelectGoal = (goal: Goal) => {
    setSelectedGoal(goal)
    setSubMode("detail")
  }

  const handleBack = () => {
    setSelectedGoal(null)
    setSubMode("overview")
  }

  const handleUpdateStageStatus = (goal: Goal, stageId: string, status: Stage["status"]) => {
    const updatedStages = goal.stages.map((s) => (s.id === stageId ? { ...s, status } : s))
    // If setting a stage to active, set previous stages to completed
    if (status === "active") {
      const stageIndex = updatedStages.findIndex((s) => s.id === stageId)
      updatedStages.forEach((s, i) => {
        if (i < stageIndex && s.status !== "completed") {
          s.status = "completed"
        }
      })
    }
    onUpdateGoal({ ...goal, stages: updatedStages })
  }

  // Get tasks and entries for a specific stage
  const getStageTasks = (stageId: string) => tasks.filter((t) => t.stageId === stageId)
  const getStageEntries = (stageId: string) => entries.filter((e) => e.stageId === stageId)

  // Get all tasks/entries for a goal (including those not assigned to a stage)
  const getGoalTasks = (goalId: string) => tasks.filter((t) => t.goalId === goalId)
  const getGoalEntries = (goalId: string) => entries.filter((e) => e.goalId === goalId)

  // Get current stage (first active or first pending)
  const getCurrentStage = (goal: Goal): Stage | null => {
    return goal.stages.find((s) => s.status === "active") || goal.stages.find((s) => s.status === "pending") || null
  }

  const renderOverview = () => (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-muted-foreground">Plan and track your long-term objectives</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSubMode("five-year")}>
            <Calendar className="h-4 w-4 mr-2" />
            Five Year Plan
          </Button>
          <Button onClick={onCreateGoal}>
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map((goal) => {
          const currentStage = getCurrentStage(goal)
          const completedStages = goal.stages.filter((s) => s.status === "completed").length
          const goalTasks = getGoalTasks(goal.id)

          return (
            <div
              key={goal.id}
              className="rounded-xl border border-border/50 bg-card/50 p-5 hover:border-border transition-colors cursor-pointer"
              onClick={() => handleSelectGoal(goal)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2" style={{ backgroundColor: `${goal.color}20` }}>
                    <Target className="h-5 w-5" style={{ color: goal.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{goal.title}</h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${categoryColors[goal.category]}20`,
                        color: categoryColors[goal.category],
                      }}
                    >
                      {goal.category}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditGoal(goal)
                      }}
                    >
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteGoal(goal)
                      }}
                      className="text-red-400"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {goal.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{goal.description}</p>
              )}

              {/* Current Stage */}
              {currentStage && (
                <div className="mb-3 p-2 rounded-lg bg-muted/30 border border-border/30">
                  <div className="text-xs text-muted-foreground mb-1">Current Stage</div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: goal.color }} />
                    <span className="text-sm font-medium">{currentStage.title}</span>
                  </div>
                </div>
              )}

              {/* Stage Progress */}
              {goal.stages.length > 0 && (
                <div className="flex items-center gap-1 mb-3">
                  {goal.stages.map((stage, i) => (
                    <div
                      key={stage.id}
                      className={cn(
                        "flex-1 h-1.5 rounded-full",
                        stage.status === "completed" ? "opacity-100" : "opacity-30",
                      )}
                      style={{ backgroundColor: goal.color }}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {completedStages}/{goal.stages.length} stages
                </span>
                <span>{goalTasks.length} tasks</span>
              </div>
            </div>
          )
        })}

        {goals.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold mb-2">No goals yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first goal to start planning</p>
            <Button onClick={onCreateGoal}>
              <Plus className="h-4 w-4 mr-2" />
              Create Goal
            </Button>
          </div>
        )}
      </div>
    </div>
  )

  const renderFiveYearPlan = () => {
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 5 }, (_, i) => currentYear + i)

    const getGoalsForYear = (year: number) =>
      goals.filter((g) => {
        const targetYear = new Date(g.targetDate).getFullYear()
        return targetYear === year
      })

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setSubMode("overview")}>
              <ChevronRight className="h-4 w-4 rotate-180 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Five Year Plan</h1>
              <p className="text-muted-foreground">Your long-term vision</p>
            </div>
          </div>
          <Button onClick={onCreateGoal}>
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Year columns */}
          <div className="grid grid-cols-5 gap-4">
            {years.map((year, yearIndex) => {
              const yearGoals = getGoalsForYear(year)
              const isCurrentYear = year === currentYear

              return (
                <div key={year} className="space-y-4">
                  <div
                    className={cn(
                      "text-center py-3 rounded-lg border",
                      isCurrentYear
                        ? "bg-primary/10 border-primary text-primary font-bold"
                        : "bg-muted/30 border-border/50",
                    )}
                  >
                    {year}
                  </div>

                  <div className="space-y-3 min-h-[200px]">
                    {yearGoals.map((goal) => {
                      const currentStage = getCurrentStage(goal)
                      return (
                        <div
                          key={goal.id}
                          className="p-3 rounded-lg border border-border/50 bg-card/50 cursor-pointer hover:border-border transition-colors"
                          style={{ borderLeftColor: goal.color, borderLeftWidth: 3 }}
                          onClick={() => handleSelectGoal(goal)}
                        >
                          <div className="font-medium text-sm mb-1">{goal.title}</div>
                          {currentStage && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <ArrowRight className="h-3 w-3" />
                              {currentStage.title}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderDetail = () => {
    if (!selectedGoal) return null

    const goalTasks = getGoalTasks(selectedGoal.id)
    const goalEntries = getGoalEntries(selectedGoal.id)
    const currentStage = getCurrentStage(selectedGoal)

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleBack}>
              <ChevronRight className="h-4 w-4 rotate-180 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2" style={{ backgroundColor: `${selectedGoal.color}20` }}>
                <Target className="h-6 w-6" style={{ color: selectedGoal.color }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{selectedGoal.title}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: `${categoryColors[selectedGoal.category]}20`,
                      color: categoryColors[selectedGoal.category],
                    }}
                  >
                    {selectedGoal.category}
                  </span>
                  <span>
                    {new Date(selectedGoal.startDate).toLocaleDateString()} -{" "}
                    {new Date(selectedGoal.targetDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => onEditGoal(selectedGoal)}>
            Edit Goal
          </Button>
        </div>

        {selectedGoal.description && <p className="text-muted-foreground">{selectedGoal.description}</p>}

        {/* Stages */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Plan Stages</h2>

          {selectedGoal.stages.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <p className="text-muted-foreground mb-2">No stages defined yet</p>
              <Button variant="outline" onClick={() => onEditGoal(selectedGoal)}>
                Add Stages
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedGoal.stages.map((stage, index) => {
                const stageTasks = getStageTasks(stage.id)
                const stageEntries = getStageEntries(stage.id)
                const isActive = stage.status === "active"
                const isCompleted = stage.status === "completed"

                return (
                  <div
                    key={stage.id}
                    className={cn(
                      "rounded-xl border p-4 transition-all",
                      isActive && "border-primary bg-primary/5",
                      isCompleted && "border-green-500/50 bg-green-500/5",
                      !isActive && !isCompleted && "border-border/50 bg-card/50",
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                            isCompleted && "bg-green-500 text-white",
                            isActive && "bg-primary text-primary-foreground",
                            !isActive && !isCompleted && "bg-muted text-muted-foreground",
                          )}
                        >
                          {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold">{stage.title}</h3>
                          {stage.description && <p className="text-sm text-muted-foreground">{stage.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">In Progress</span>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {stage.status !== "active" && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStageStatus(selectedGoal, stage.id, "active")}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Set as Active
                              </DropdownMenuItem>
                            )}
                            {stage.status !== "completed" && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStageStatus(selectedGoal, stage.id, "completed")}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark Complete
                              </DropdownMenuItem>
                            )}
                            {stage.status !== "pending" && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStageStatus(selectedGoal, stage.id, "pending")}
                              >
                                <Circle className="h-4 w-4 mr-2" />
                                Reset to Pending
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Stage Items */}
                    <div className="ml-11 space-y-2">
                      {stageTasks.length > 0 && (
                        <div className="space-y-1">
                          {stageTasks.map((task) => (
                            <div key={task.id} className="flex items-center gap-2 text-sm py-1">
                              <ListTodo className="h-4 w-4 text-muted-foreground" />
                              <span className={cn(task.completed && "line-through text-muted-foreground")}>
                                {task.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {stageEntries.length > 0 && (
                        <div className="space-y-1">
                          {stageEntries.map((entry) => (
                            <div key={entry.id} className="flex items-center gap-2 text-sm py-1">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span>{entry.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(entry.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {stageTasks.length === 0 && stageEntries.length === 0 && (
                        <p className="text-xs text-muted-foreground py-2">
                          No tasks or entries linked to this stage yet
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Unassigned Tasks & Entries */}
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl border border-border/50 bg-card/50 p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Related Tasks
              <span className="text-muted-foreground font-normal">({goalTasks.length})</span>
            </h2>
            <div className="space-y-2">
              {goalTasks
                .filter((t) => !t.stageId)
                .map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className={cn(task.completed && "line-through text-muted-foreground")}>{task.title}</span>
                  </div>
                ))}
              {goalTasks.filter((t) => !t.stageId).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No unassigned tasks</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card/50 p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Related Entries
              <span className="text-muted-foreground font-normal">({goalEntries.length})</span>
            </h2>
            <div className="space-y-2">
              {goalEntries
                .filter((e) => !e.stageId)
                .map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30">
                    <span>{entry.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              {goalEntries.filter((e) => !e.stageId).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No unassigned entries</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      {subMode === "overview" && renderOverview()}
      {subMode === "five-year" && renderFiveYearPlan()}
      {subMode === "detail" && renderDetail()}
    </div>
  )
}
