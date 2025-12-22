"use client"

import type React from "react"
import { Target, Repeat } from "lucide-react"
import type { Event } from "@/lib/types"
import { cn } from "@/lib/utils"

interface AllDayEventBannerProps {
  event: Event
  eventColor: {
    isGoalColor: boolean
    style?: React.CSSProperties
    classes?: any
  }
  draggingEvent: Event | null
  onDragStart: (e: React.DragEvent, event: Event) => void
  onDragEnd: () => void
  onSelect: (event: Event) => void
}

export function AllDayEventBanner({
  event,
  eventColor,
  draggingEvent,
  onDragStart,
  onDragEnd,
  onSelect,
}: AllDayEventBannerProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, event)}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(event)
      }}
      style={eventColor.isGoalColor ? eventColor.style : {}}
      className={cn(
        "rounded px-2 py-1 text-xs font-medium cursor-grab active:cursor-grabbing",
        "truncate mb-0.5",
        !eventColor.isGoalColor && eventColor.classes?.bg,
        !eventColor.isGoalColor && eventColor.classes?.text,
        draggingEvent?.id === event.id && "opacity-50",
      )}
    >
      <div className="flex items-center gap-1">
        <span className="truncate">{event.title}</span>
        {eventColor.isGoalColor && <Target className="h-3 w-3 shrink-0 opacity-75" />}
        {event.rrule && <Repeat className="h-3 w-3 shrink-0 opacity-75" />}
      </div>
    </div>
  )
}
