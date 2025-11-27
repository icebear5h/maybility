"use client"

import { useState } from "react"
import type { JournalEntry, Task, Goal } from "@/lib/types"
import type { TimeSubMode } from "@/lib/types"
import { CalendarView } from "./calendar-view"
import { TimelineView } from "./timeline-view"
import { cn } from "@/lib/utils"
import { Calendar, GitBranch } from "lucide-react"

interface TimeViewProps {
  entries: JournalEntry[]
  onSelectEntry: (entry: JournalEntry | null) => void
  onCreateEntry: (date?: Date) => void
  isDraggingTask?: boolean
  onTaskDrop?: (task: Task, date: Date) => void
  onUpdateEntry?: (entry: JournalEntry) => void
  goals?: Goal[]
}

export function TimeView({
  entries,
  onSelectEntry,
  onCreateEntry,
  isDraggingTask,
  onTaskDrop,
  onUpdateEntry,
  goals,
}: TimeViewProps) {
  const [subMode, setSubMode] = useState<TimeSubMode>("calendar")

  return (
    <div className="flex h-full flex-col">
      {/* Sub-mode toggle */}
      <div className="absolute top-4 left-1/2 z-20 -translate-x-1/2">
        <div className="flex items-center gap-1 rounded-full border border-border/50 bg-card/80 p-1 backdrop-blur-sm">
          <button
            onClick={() => setSubMode("calendar")}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
              subMode === "calendar"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </button>
          <button
            onClick={() => setSubMode("timeline")}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
              subMode === "timeline"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <GitBranch className="h-4 w-4" />
            Timeline
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1">
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-300",
            subMode === "calendar" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
          )}
        >
          <CalendarView
            entries={entries}
            onSelectEntry={onSelectEntry}
            onCreateEntry={onCreateEntry}
            isDraggingTask={isDraggingTask}
            onTaskDrop={onTaskDrop}
            onUpdateEntry={onUpdateEntry}
            goals={goals}
          />
        </div>

        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-300",
            subMode === "timeline" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
          )}
        >
          <TimelineView
            entries={entries}
            onSelectEntry={onSelectEntry}
            onCreateEntry={onCreateEntry}
            onUpdateEntry={onUpdateEntry}
          />
        </div>
      </div>
    </div>
  )
}
