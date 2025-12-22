"use client"

import { format, isSameMonth, isSameDay, isToday } from "date-fns"
import { Plus, Target } from "lucide-react"
import type { Event, Goal } from "@/lib/types"
import { cn } from "@/lib/utils"
import { entryOccursOnDate } from "@/lib/calendar-utils"

interface MonthViewProps {
  calendarDays: Date[]
  currentDate: Date
  selectedDate: Date | null
  events: any[]
  goals: Goal[]
  isDraggingTask: boolean
  draggingEvent: Event | null
  dropTarget: string | null
  onSelectDate: (date: Date) => void
  onSelectEvent: (event: any) => void
  onDragOver: (e: React.DragEvent, targetId: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, date: Date) => void
  onEventDragStart: (e: React.DragEvent, event: any) => void
  onEventDragEnd: () => void
  getEventColor: (event: any) => any
}

export function MonthView({
  calendarDays,
  currentDate,
  selectedDate,
  events = [],
  goals = [],
  isDraggingTask,
  draggingEvent,
  dropTarget,
  onSelectDate,
  onSelectEvent,
  onDragOver,
  onDragLeave,
  onDrop,
  onEventDragStart,
  onEventDragEnd,
  getEventColor,
}: MonthViewProps) {
  const getEventsForDate = (date: Date): any[] => {
    return events.filter((event) => entryOccursOnDate(event, date))
  }

  return (
    <>
      <div className="mb-2 grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 flex-1">
        {calendarDays.map((day, index) => {
          const dateKey = format(day, "yyyy-MM-dd")
          const dayEvents = getEventsForDate(day)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const isDropTarget = dropTarget === dateKey

          return (
            <div
              key={index}
              onClick={() => onSelectDate(day)}
              onDragOver={(e) => onDragOver(e, dateKey)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, day)}
              className={cn(
                "relative flex min-h-[100px] flex-col rounded-lg border p-2 text-left transition-all cursor-pointer",
                isCurrentMonth ? "border-border/50 hover:border-primary/50" : "border-transparent opacity-40",
                isSelected && "border-primary ring-1 ring-primary",
                isToday(day) && "bg-primary/5",
                (isDraggingTask || draggingEvent) && "border-dashed",
                isDropTarget && "border-primary bg-primary/10 ring-2 ring-primary",
              )}
            >
              <span className={cn("text-sm font-medium", isToday(day) && "text-primary")}>{format(day, "d")}</span>

              {dayEvents.length > 0 && (
                <div className="mt-1 space-y-0.5 overflow-hidden">
                  {dayEvents.slice(0, 3).map((event) => {
                    const eventColor = getEventColor(event)
                    return (
                      <div
                        key={event.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation()
                          onEventDragStart(e, event)
                        }}
                        onDragEnd={onEventDragEnd}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectEvent(event)
                        }}
                        style={
                          eventColor.isGoalColor
                            ? { backgroundColor: eventColor.style?.backgroundColor, color: eventColor.style?.color }
                            : {}
                        }
                        className={cn(
                          "rounded px-1.5 py-0.5 text-xs truncate cursor-grab active:cursor-grabbing flex items-center gap-1",
                          !eventColor.isGoalColor && eventColor.classes?.bg,
                          !eventColor.isGoalColor && eventColor.classes?.text,
                          draggingEvent?.id === event.id && "opacity-50",
                        )}
                      >
                        {!event.isAllDay && (
                          <span className="opacity-75">{format(new Date(event.createdAt), "h:mm")}</span>
                        )}
                        <span className="truncate">{event.title}</span>
                        {eventColor.isGoalColor && <Target className="h-3 w-3 shrink-0 opacity-75" />}
                      </div>
                    )
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              )}

              {isDropTarget && !dayEvents.length && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-primary/10 pointer-events-none">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
