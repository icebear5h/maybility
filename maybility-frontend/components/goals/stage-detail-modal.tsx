"use client"

import type { Stage, Goal, Event as EventType } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { X, Flag, Calendar, CheckCircle2, Circle, Clock, FileText, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface StageDetailModalProps {
  stage: Stage
  goal: Goal
  events: EventType[]
  isOpen: boolean
  onClose: () => void
  onEditStage: (stage: Stage, goal: Goal) => void
  onCreateTask?: () => void
  onCreateEvent?: () => void
  onCreateJournalEntry?: () => void
}

export function StageDetailModal({
  stage,
  goal,
  events,
  isOpen,
  onClose,
  onEditStage,
  onCreateTask,
  onCreateEvent,
  onCreateJournalEntry,
}: StageDetailModalProps) {
  if (!isOpen) return null

  const stageEvents = events.filter((e) => e.stageId === stage.id)
  const todos = stageEvents.filter((e) => e.taskStatus)
  const scheduledEvents = stageEvents.filter((e) => e.startTime && !e.taskStatus)
  const journalEntries = stage.entryPaths || []

  const displayColor = stage.color || goal.color || "#3b82f6"

  const renderTodos = () => {
    const sortedTodos = [...todos].sort((a, b) => {
      const statusOrder = { TODO: 0, IN_PROGRESS: 1, DONE: 2 }
      return (statusOrder[a.taskStatus!] || 0) - (statusOrder[b.taskStatus!] || 0)
    })

    return (
      <div className="space-y-3">
        {sortedTodos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No tasks yet</p>
          </div>
        ) : (
          sortedTodos.map((todo) => (
            <div
              key={todo.id}
              className="p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  {todo.taskStatus === "DONE" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : todo.taskStatus === "IN_PROGRESS" ? (
                    <Clock className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-medium text-sm",
                      todo.taskStatus === "DONE" && "line-through text-muted-foreground"
                    )}
                  >
                    {todo.title}
                  </p>
                  {todo.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{todo.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {todo.dueDate && (
                      <span
                        className={cn(
                          new Date(todo.dueDate) < new Date() && todo.taskStatus !== "DONE"
                            ? "text-red-500 font-medium"
                            : ""
                        )}
                      >
                        Due {new Date(todo.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full",
                        todo.priority === "HIGH"
                          ? "bg-red-500/10 text-red-500"
                          : todo.priority === "MEDIUM"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-blue-500/10 text-blue-500"
                      )}
                    >
                      {todo.priority}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  const renderEvents = () => {
    const sortedEvents = [...scheduledEvents].sort((a, b) => {
      const dateA = a.startTime ? new Date(a.startTime).getTime() : 0
      const dateB = b.startTime ? new Date(b.startTime).getTime() : 0
      return dateA - dateB
    })

    return (
      <div className="space-y-3">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No events yet</p>
          </div>
        ) : (
          sortedEvents.map((event) => (
            <div
              key={event.id}
              className="p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                  style={{ backgroundColor: event.color }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{event.title}</h4>
                  {event.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {event.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {event.startTime && (
                      <span>
                        {new Date(event.startTime).toLocaleDateString()}
                        {!event.isAllDay && (
                          <> · {new Date(event.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
                        )}
                      </span>
                    )}
                    {event.location && (
                      <span className="truncate">{event.location}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  const renderJournal = () => {
    return (
      <div className="space-y-3">
        {journalEntries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No entries yet</p>
          </div>
        ) : (
          journalEntries.map((entryPath, index) => (
            <div
              key={index}
              className="p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium truncate">{entryPath}</span>
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-7xl max-h-[95vh] overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2" style={{ backgroundColor: `${displayColor}20` }}>
                <Flag className="h-5 w-5" style={{ color: displayColor }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{stage.title}</h2>
                <p className="text-sm text-muted-foreground">in {goal.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onEditStage(stage, goal)}>
                Edit
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {stage.description && (
            <p className="text-sm text-muted-foreground mt-3">{stage.description}</p>
          )}

          {stage.targetDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Calendar className="h-4 w-4" />
              <span>Target: {new Date(stage.targetDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Kanban Columns */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-3 gap-6 h-full">
            {/* Tasks Column */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Tasks ({todos.length})</h3>
                {onCreateTask && (
                  <Button onClick={onCreateTask} size="sm" variant="ghost">
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-auto">
                {renderTodos()}
              </div>
            </div>

            {/* Events Column */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Events ({scheduledEvents.length})</h3>
                {onCreateEvent && (
                  <Button onClick={onCreateEvent} size="sm" variant="ghost">
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-auto">
                {renderEvents()}
              </div>
            </div>

            {/* Journal Column */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Journal ({journalEntries.length})</h3>
                {onCreateJournalEntry && (
                  <Button onClick={onCreateJournalEntry} size="sm" variant="ghost">
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-auto">
                {renderJournal()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
