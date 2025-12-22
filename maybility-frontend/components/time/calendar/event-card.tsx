"use client"

import type React from "react"
import { format, addMinutes } from "date-fns"
import { Target, Repeat } from "lucide-react"
import type { Event } from "@/lib/types"
import { cn } from "@/lib/utils"

interface EventCardProps {
  event: Event
  style?: React.CSSProperties
  isCompact?: boolean
  showResizeHandles?: boolean
  eventColor: {
    isGoalColor: boolean
    style?: React.CSSProperties
    classes?: any
  }
  draggingEvent: Event | null
  resizingEvent: {
    event: Event
    edge: "top" | "bottom"
    startY: number
    originalStart: Date
    originalEnd: Date
    currentStart: Date
    currentEnd: Date
  } | null
  onDragStart: (e: React.DragEvent, event: Event) => void
  onDragEnd: () => void
  onSelect: (event: Event) => void
  onResizeStart: (e: React.MouseEvent, event: Event, edge: "top" | "bottom") => void
}

export function EventCard({
  event,
  style,
  isCompact = false,
  showResizeHandles = false,
  eventColor,
  draggingEvent,
  resizingEvent,
  onDragStart,
  onDragEnd,
  onSelect,
  onResizeStart,
}: EventCardProps) {
  const startTime = new Date(event.startTime!)
  const endTime = event.endTime ? new Date(event.endTime) : addMinutes(startTime, 60)

  return (
    <div
      draggable={!resizingEvent}
      onDragStart={(e) => {
        if (resizingEvent) {
          e.preventDefault()
          return
        }
        onDragStart(e, event)
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation()
        // Don't select if drag or resize is in progress
        if (draggingEvent || resizingEvent) return
        onSelect(event)
      }}
      style={{
        ...style,
        ...(eventColor.isGoalColor ? eventColor.style : {}),
      }}
      className={cn(
        "absolute rounded-md cursor-grab active:cursor-grabbing overflow-hidden group",
        "border-l-4 shadow-sm hover:shadow-md hover:z-50",
        !eventColor.isGoalColor && eventColor.classes?.bg,
        !eventColor.isGoalColor && eventColor.classes?.text,
        !eventColor.isGoalColor && eventColor.classes?.border,
        draggingEvent?.id === event.id && "opacity-60",
        resizingEvent?.event.id === event.id && "ring-2 ring-primary z-50 cursor-ns-resize",
        isCompact ? "px-1 py-0.5" : "px-2 py-1",
      )}
    >
      {showResizeHandles && !isCompact && (
        <div
          onMouseDown={(e) => {
            if (draggingEvent) return
            e.preventDefault()
            e.stopPropagation()
            onResizeStart(e, event, "top")
          }}
          draggable={false}
          className="absolute top-0 left-0 right-0 h-3 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/30 hover:bg-white/50 transition-opacity z-10"
        />
      )}

      <div className="flex items-start gap-1">
        <div className="flex-1 min-w-0">
          <div className={cn("font-medium truncate", isCompact ? "text-xs" : "text-sm")}>{event.title}</div>
          {!isCompact && (
            <div className="text-xs opacity-90">
              {format(startTime, "h:mm")} - {format(endTime, "h:mma").toLowerCase()}
            </div>
          )}
        </div>
        {eventColor.isGoalColor && (
          <Target className={cn("shrink-0 opacity-75", isCompact ? "h-3 w-3" : "h-4 w-4")} />
        )}
        {event.rrule && <Repeat className={cn("shrink-0 opacity-75", isCompact ? "h-3 w-3" : "h-4 w-4")} />}
      </div>

      {showResizeHandles && !isCompact && (
        <div
          onMouseDown={(e) => {
            if (draggingEvent) return
            e.preventDefault()
            e.stopPropagation()
            onResizeStart(e, event, "bottom")
          }}
          draggable={false}
          className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/30 hover:bg-white/50 transition-opacity z-10"
        />
      )}
    </div>
  )
}
