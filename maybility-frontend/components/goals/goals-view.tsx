"use client"

import { useState, useEffect } from "react"
import type { Goal, Task, Stage } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Target,
  Plus,
  ChevronRight,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  ListTodo,
  Calendar,
  Archive,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFocusMode } from "../focus/focus-mode-provider"
import { StageDetailModal } from "./stage-detail-modal"
import type { Event as EventType } from "@/lib/types"

interface GoalsViewProps {
  goals: Goal[]
  events: EventType[]
  onCreateGoal: () => void
  onEditGoal: (goal: Goal) => void
  onArchiveGoal: (goal: Goal) => void
  onDeleteGoal: (goal: Goal) => void
  onCreateStage: (goal: Goal) => void
  onEditStage: (stage: Stage, goal: Goal) => void
  onDeleteStage: (stage: Stage) => void
  onCreateTask?: (goalId?: string, stageId?: string) => void
  onCreateEvent?: (date?: Date, goalId?: string, stageId?: string) => void
  onCreateJournalEntry?: (goalId?: string, stageId?: string) => void
}

type GoalsSubMode = "active" | "archived" | "detail"

export function GoalsView({
  goals,
  events,
  onCreateGoal,
  onEditGoal,
  onArchiveGoal,
  onDeleteGoal,
  onCreateStage,
  onEditStage,
  onDeleteStage,
  onCreateTask,
  onCreateEvent,
  onCreateJournalEntry,
}: GoalsViewProps) {
  const { focusLevel, focusTarget, setFocusTarget } = useFocusMode()
  const [subMode, setSubMode] = useState<GoalsSubMode>("active")
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null)
  const [stageDetailOpen, setStageDetailOpen] = useState(false)
  const [detailStage, setDetailStage] = useState<Stage | null>(null)
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null)

  const activeGoals = goals.filter((g) => !g.archived)
  const archivedGoals = goals.filter((g) => g.archived)

  // Cleanup click timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout)
      }
    }
  }, [clickTimeout])

  // Sync selectedGoal and selectedStage when goals array updates
  useEffect(() => {
    if (selectedGoal) {
      const updatedGoal = goals.find((g) => g.id === selectedGoal.id)
      if (updatedGoal) {
        setSelectedGoal(updatedGoal)
        // Sync selected stage if it exists
        if (selectedStage) {
          const updatedStage = updatedGoal.stages?.find((s) => s.id === selectedStage.id)
          if (updatedStage) {
            setSelectedStage(updatedStage)
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals])

  const handleSelectGoal = (goal: Goal) => {
    setSelectedGoal(goal)
    setSubMode("detail")
    if (focusLevel === "zen") {
      setFocusTarget({ type: "goal", id: goal.id })
    }
  }

  const handleStageClick = (stage: Stage) => {
    // Clear any existing timeout
    if (clickTimeout) {
      clearTimeout(clickTimeout)
      setClickTimeout(null)
      // This is a double click - open detail modal
      setDetailStage(stage)
      setStageDetailOpen(true)
    } else {
      // Set timeout for single click
      const timeout = setTimeout(() => {
        // Single click - select/deselect
        if (selectedStage?.id === stage.id) {
          setSelectedStage(null)
          setFocusTarget(null)
        } else {
          setSelectedStage(stage)
          setFocusTarget({ type: "stage", id: stage.id, goalId: selectedGoal?.id })
        }
        setClickTimeout(null)
      }, 250)
      setClickTimeout(timeout)
    }
  }

  const handleBack = () => {
    setSelectedGoal(null)
    setSelectedStage(null)
    setSubMode("active")
    setFocusTarget(null)
  }

  const getCompletedTasks = (events?: EventType[]) =>
    events?.filter((e) => e.taskStatus === "DONE").length || 0
  const getTotalTasks = (events?: EventType[]) => events?.filter((e) => e.taskStatus).length || 0

  const renderGoalCard = (goal: Goal) => {
    const goalEvents = events.filter((e) => e.goalId === goal.id && e.taskStatus)
    const totalTasks = getTotalTasks(goalEvents)
    const completedTasks = getCompletedTasks(goalEvents)
    const totalStages = goal.stages?.length || 0

    return (
      <div
        key={goal.id}
        className="rounded-xl border border-border/50 bg-card/50 p-5 hover:border-border transition-colors cursor-pointer"
        onClick={() => handleSelectGoal(goal)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2" style={{ backgroundColor: `${goal.color || "#3b82f6"}20` }}>
              <Target className="h-5 w-5" style={{ color: goal.color || "#3b82f6" }} />
            </div>
            <div>
              <h3 className="font-semibold">{goal.title}</h3>
              {goal.targetDate && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(goal.targetDate).toLocaleDateString()}</span>
                </div>
              )}
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
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onArchiveGoal(goal)
                }}
              >
                <Archive className="h-4 w-4 mr-2" />
                {goal.archived ? "Unarchive" : "Archive"}
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

        {goal.definitionOfDone && (
          <div className="mb-3 p-2 rounded-lg bg-muted/30 border border-border/30">
            <div className="text-xs text-muted-foreground mb-1">Definition of Done</div>
            <p className="text-sm line-clamp-1">{goal.definitionOfDone}</p>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{totalStages} stages</span>
          <span>
            {completedTasks}/{totalTasks} tasks
          </span>
        </div>
      </div>
    )
  }

  const renderOverview = () => {
    let displayGoals = subMode === "archived" ? archivedGoals : activeGoals

    // In zen mode, only show the focused goal
    if (focusLevel === "zen" && focusTarget?.type === "goal") {
      displayGoals = displayGoals.filter((g) => g.id === focusTarget.id)
    }

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Goals</h1>
            <p className="text-muted-foreground">Plan and track your objectives</p>
          </div>
          {focusLevel !== "zen" && (
            <div className="flex gap-2">
              <Button
                variant={subMode === "active" ? "default" : "outline"}
                onClick={() => setSubMode("active")}
              >
                Active ({activeGoals.length})
              </Button>
              <Button
                variant={subMode === "archived" ? "default" : "outline"}
                onClick={() => setSubMode("archived")}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archived ({archivedGoals.length})
              </Button>
              <Button onClick={onCreateGoal}>
                <Plus className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayGoals.map(renderGoalCard)}

          {displayGoals.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-2">
                No {subMode === "archived" ? "archived" : ""} goals yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {subMode === "archived"
                  ? "Archived goals will appear here"
                  : "Create your first goal to start planning"}
              </p>
              {subMode === "active" && (
                <Button onClick={onCreateGoal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Goal
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderDetail = () => {
    if (!selectedGoal) return null

    let stages = (selectedGoal.stages || []).sort((a, b) => a.order - b.order)

    // In zen mode with a selected stage, only show that stage
    if (focusLevel === "zen" && selectedStage) {
      stages = stages.filter((s) => s.id === selectedStage.id)
    }

    const goalTasks = events.filter((e) => e.goalId === selectedGoal.id && e.taskStatus)

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {focusLevel !== "zen" && (
              <Button variant="ghost" onClick={handleBack}>
                <ChevronRight className="h-4 w-4 rotate-180 mr-2" />
                Back
              </Button>
            )}
            <div className="flex items-center gap-3">
              <div
                className="rounded-lg p-2"
                style={{ backgroundColor: `${selectedGoal.color || "#3b82f6"}20` }}
              >
                <Target className="h-6 w-6" style={{ color: selectedGoal.color || "#3b82f6" }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{selectedGoal.title}</h1>
                {selectedGoal.targetDate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Target: {new Date(selectedGoal.targetDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {focusLevel !== "zen" && (
            <Button variant="outline" onClick={() => onEditGoal(selectedGoal)}>
              Edit Goal
            </Button>
          )}
        </div>

        {selectedGoal.description && <p className="text-muted-foreground">{selectedGoal.description}</p>}

        {selectedGoal.definitionOfDone && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
            <div className="text-sm font-medium mb-1">Definition of Done</div>
            <p className="text-sm text-muted-foreground">{selectedGoal.definitionOfDone}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Stages</h2>
            {stages.length > 0 && focusLevel !== "zen" && (
              <Button variant="outline" size="sm" onClick={() => onCreateStage(selectedGoal)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Stage
              </Button>
            )}
          </div>

          {stages.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <p className="text-muted-foreground mb-2">No stages defined yet</p>
              <Button variant="outline" onClick={() => onCreateStage(selectedGoal)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Stage
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {stages.map((stage, index) => {
                const stageTasks = goalTasks.filter((t) => t.stageId === stage.id)
                const completedTasks = stageTasks.filter((t) => t.taskStatus === "DONE").length
                const isSelected = selectedStage?.id === stage.id
                const isDulled = selectedStage && !isSelected

                return (
                  <div
                    key={stage.id}
                    onClick={() => handleStageClick(stage)}
                    className={cn(
                      "rounded-xl border p-4 transition-all cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border/50 bg-card/50 hover:border-border",
                      isDulled && "opacity-40 hover:opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                            isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold">{stage.title}</h3>
                          {stage.description && (
                            <p className="text-sm text-muted-foreground">{stage.description}</p>
                          )}
                          {stage.targetDate && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(stage.targetDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {focusLevel !== "zen" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEditStage(stage, selectedGoal)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDeleteStage(stage)}
                              className="text-red-400"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {stageTasks.length > 0 && (
                      <div className="ml-11 space-y-1">
                        <div className="text-xs text-muted-foreground mb-2">
                          {completedTasks}/{stageTasks.length} tasks completed
                        </div>
                        {stageTasks.map((task) => (
                          <div key={task.id} className="flex items-center gap-2 text-sm py-1">
                            {task.taskStatus === "DONE" ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span
                              className={cn(
                                task.taskStatus === "DONE" && "line-through text-muted-foreground"
                              )}
                            >
                              {task.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {stageTasks.length === 0 && (
                      <p className="ml-11 text-xs text-muted-foreground py-2">
                        No tasks assigned to this stage yet
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {focusLevel !== "zen" && goalTasks.filter((t) => !t.stageId).length > 0 && (
          <div className="rounded-xl border border-border/50 bg-card/50 p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Unassigned Tasks
              <span className="text-muted-foreground font-normal">
                ({goalTasks.filter((t) => !t.stageId).length})
              </span>
            </h2>
            <div className="space-y-2">
              {goalTasks
                .filter((t) => !t.stageId)
                .map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                    {task.taskStatus === "DONE" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span
                      className={cn(task.taskStatus === "DONE" && "line-through text-muted-foreground")}
                    >
                      {task.title}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="h-full overflow-auto">
        {subMode === "detail" ? renderDetail() : renderOverview()}
      </div>

      {detailStage && selectedGoal && (
        <StageDetailModal
          stage={detailStage}
          goal={selectedGoal}
          events={events}
          isOpen={stageDetailOpen}
          onClose={() => {
            setStageDetailOpen(false)
            setDetailStage(null)
          }}
          onEditStage={onEditStage}
          onCreateTask={onCreateTask ? () => onCreateTask(selectedGoal.id, detailStage.id) : undefined}
          onCreateEvent={onCreateEvent ? () => onCreateEvent(undefined, selectedGoal.id, detailStage.id) : undefined}
          onCreateJournalEntry={onCreateJournalEntry ? () => onCreateJournalEntry(selectedGoal.id, detailStage.id) : undefined}
        />
      )}
    </>
  )
}
