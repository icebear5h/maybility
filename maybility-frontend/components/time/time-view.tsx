"use client"

import { useState } from "react"
import type { Task, Goal, Event as EventType } from "@/lib/types"
import type { TimeSubMode } from "@/lib/types"
import { CalendarView } from "./calendar/calendar-view"
import { TimelineView } from "./timeline/timeline-view"
import { NowView3D } from "./now-3d/now-view-3d"
import { cn } from "@/lib/utils"
import { Calendar, GitBranch, Zap } from "lucide-react"

interface TimeViewProps {
  events: EventType[]
  onCreateEvent?: (date?: Date) => void
  onSelectEvent?: (event: EventType) => void
  isDraggingTask?: boolean
  onTaskDrop?: (task: Task, date: Date) => void
  onUpdateEvent?: (event: EventType) => void
  goals?: Goal[]
}

export function TimeView({
  events,
  onCreateEvent,
  onSelectEvent,
  isDraggingTask,
  onTaskDrop,
  onUpdateEvent,
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
          <button
            onClick={() => setSubMode("now")}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
              subMode === "now"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Zap className="h-4 w-4" />
            Now
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1">
        {subMode === "calendar" && (
          <div className="absolute inset-0">
            <CalendarView
              events={events}
              onCreateEvent={onCreateEvent}
              onSelectEvent={onSelectEvent}
              isDraggingTask={isDraggingTask}
              onTaskDrop={onTaskDrop}
              onUpdateEvent={onUpdateEvent}
              goals={goals}
            />
          </div>
        )}

        {subMode === "timeline" && (
          <div className="absolute inset-0">
            <TimelineView
              events={events}
              onSelectEvent={onSelectEvent}
              onCreateEvent={onCreateEvent}
              onUpdateEvent={onUpdateEvent}
              onTaskDrop={onTaskDrop}
              isDraggingTask={isDraggingTask}
              goals={goals}
            />
          </div>
        )}

        {subMode === "now" && (
          <div className="absolute inset-0">
            <NowView3D
              events={events}
              goals={goals}
              onSelectEvent={onSelectEvent}
              onUpdateEvent={onUpdateEvent}
            />
          </div>
        )}
      </div>
    </div>
  )
}
