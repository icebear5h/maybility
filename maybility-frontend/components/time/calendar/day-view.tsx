"use client"

import { format, isToday, getHours, getMinutes, addMinutes } from "date-fns"
import { Plus, Target, Repeat } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Event } from "@/lib/types"
import { cn } from "@/lib/utils"
import { entryOccursOnDate, calculateEventColumns } from "@/lib/calendar-utils"
import { EventCard } from "./event-card"
import { AllDayEventBanner } from "./all-day-event-banner"

const HOUR_HEIGHT = 60

interface DayViewProps {
  currentDate: Date
  events: any[]
  isDraggingTask: boolean
  draggingEvent: Event | null
  resizingEvent: any
  dropTarget: string | null
  onSelectEvent: (event: any) => void
  onCreateEvent?: (date: Date) => void
  onDragOver: (e: React.DragEvent, targetId: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, date: Date, hour?: number) => void
  onEventDragStart: (e: React.DragEvent, event: any) => void
  onEventDragEnd: () => void
  onResizeStart: (e: React.MouseEvent, event: any, edge: "top" | "bottom") => void
  onResizeMove: (e: React.MouseEvent) => void
  onResizeEnd: () => void
  getEventColor: (event: any) => any
}

export function DayView({
  currentDate,
  events = [],
  isDraggingTask,
  draggingEvent,
  resizingEvent,
  dropTarget,
  onSelectEvent,
  onCreateEvent,
  onDragOver,
  onDragLeave,
  onDrop,
  onEventDragStart,
  onEventDragEnd,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  getEventColor,
}: DayViewProps) {
  const getEventsForDate = (date: Date): any[] => {
    return events.filter((event) => entryOccursOnDate(event, date))
  }

  const getAllDayEvents = (date: Date): any[] => {
    return getEventsForDate(date).filter((event) => event.isAllDay)
  }

  const getTimedEvents = (date: Date): any[] => {
    return getEventsForDate(date).filter((event) => !event.isAllDay)
  }

  const timedEvents = getTimedEvents(currentDate)
  const allDayEvents = getAllDayEvents(currentDate)
  const positions = calculateEventColumns(timedEvents)

  return (
    <div
      className="flex flex-1 overflow-hidden"
      onMouseMove={resizingEvent ? onResizeMove : undefined}
      onMouseUp={resizingEvent ? onResizeEnd : undefined}
      onMouseLeave={resizingEvent ? onResizeEnd : undefined}
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        {allDayEvents.length > 0 && (
          <div className="border-b border-border/50 p-2">
            <div className="text-xs text-muted-foreground mb-1">All day</div>
            <div className="space-y-1">
              {allDayEvents.map((event) => (
                <AllDayEventBanner
                  key={event.id}
                  event={event}
                  eventColor={getEventColor(event)}
                  draggingEvent={draggingEvent}
                  onDragStart={onEventDragStart}
                  onDragEnd={onEventDragEnd}
                  onSelect={onSelectEvent}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
            {Array.from({ length: 24 }, (_, hour) => {
              const cellId = `${format(currentDate, "yyyy-MM-dd")}-${hour}`
              const isDropTargetCell = dropTarget === cellId

              return (
                <div
                  key={hour}
                  className="absolute w-full flex border-b border-border/30"
                  style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                >
                  <div className="w-20 shrink-0 pr-3 text-right">
                    <span className="text-sm text-muted-foreground relative -top-2">
                      {hour === 0 ? "" : format(new Date().setHours(hour, 0), "h:mm a")}
                    </span>
                  </div>
                  <div
                    onDragOver={(e) => onDragOver(e, cellId)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => {
                      // Calculate exact minute based on mouse position
                      const rect = e.currentTarget.getBoundingClientRect()
                      const y = e.clientY - rect.top
                      const minuteInHour = Math.round((y / HOUR_HEIGHT) * 60 / 5) * 5 // Round to nearest 5 minutes
                      const snappedMinute = Math.min(55, Math.max(0, minuteInHour))

                      const newDate = new Date(currentDate)
                      newDate.setHours(hour, snappedMinute, 0, 0)
                      onDrop(e, newDate) // Don't pass hour - let it use the fully calculated date
                    }}
                    onClick={(e) => {
                      // Calculate exact minute based on click position
                      const rect = e.currentTarget.getBoundingClientRect()
                      const y = e.clientY - rect.top
                      const minuteInHour = Math.round((y / HOUR_HEIGHT) * 60 / 5) * 5 // Round to nearest 5 minutes
                      const snappedMinute = Math.min(55, Math.max(0, minuteInHour))

                      const newDate = new Date(currentDate)
                      newDate.setHours(hour, snappedMinute, 0, 0)
                      onCreateEvent?.(newDate)
                    }}
                    className={cn(
                      "flex-1 border-l border-border/30 cursor-pointer hover:bg-muted/20 relative",
                      (isDraggingTask || draggingEvent) && "border-dashed",
                      isDropTargetCell && "bg-primary/20",
                    )}
                  >
                    {/* 15-minute interval grid lines */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute left-0 right-0 border-t border-border/10" style={{ top: "25%" }} />
                      <div className="absolute left-0 right-0 border-t border-border/10" style={{ top: "50%" }} />
                      <div className="absolute left-0 right-0 border-t border-border/10" style={{ top: "75%" }} />
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="absolute left-20 right-0 top-0 bottom-0 pointer-events-none">
              {timedEvents.map((event) => {
                // Use current resize position if this event is being resized
                const isResizing = resizingEvent?.event.id === event.id
                const startTime = isResizing ? resizingEvent.currentStart : new Date(event.startTime!)
                const endTime = isResizing
                  ? resizingEvent.currentEnd
                  : (event.endTime ? new Date(event.endTime) : addMinutes(startTime, 60))

                const startMinutes = getHours(startTime) * 60 + getMinutes(startTime)
                const endMinutes = getHours(endTime) * 60 + getMinutes(endTime)
                const durationMinutes = endMinutes - startMinutes

                const top = (startMinutes / 60) * HOUR_HEIGHT
                const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20)

                const pos = positions.get(event.id) || { column: 0, totalColumns: 1 }
                const width = `calc(${100 / pos.totalColumns}% - 8px)`
                const left = `calc(${(pos.column / pos.totalColumns) * 100}% + 4px)`

                return (
                  <EventCard
                    key={event.id}
                    event={event}
                    isCompact={durationMinutes < 45}
                    showResizeHandles={true}
                    eventColor={getEventColor(event)}
                    draggingEvent={draggingEvent}
                    resizingEvent={resizingEvent}
                    onDragStart={onEventDragStart}
                    onDragEnd={onEventDragEnd}
                    onSelect={onSelectEvent}
                    onResizeStart={onResizeStart}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left,
                      width,
                      pointerEvents: "auto",
                    }}
                  />
                )
              })}
            </div>

            {isToday(currentDate) && (
              <div
                className="absolute left-20 right-0 flex items-center z-40 pointer-events-none"
                style={{
                  top: `${((new Date().getHours() * 60 + new Date().getMinutes()) / 60) * HOUR_HEIGHT}px`,
                }}
              >
                <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5" />
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-72 border-l border-border/50 bg-card/30 p-4 overflow-auto">
        <h3 className="text-lg font-medium mb-4">{format(currentDate, "EEEE, MMMM d")}</h3>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground">{timedEvents.length + allDayEvents.length} events</p>
        </div>

        {timedEvents.length > 0 || allDayEvents.length > 0 ? (
          <div className="space-y-2">
            {[...allDayEvents, ...timedEvents].map((event) => {
              const eventColor = getEventColor(event)
              return (
                <button
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  style={eventColor.isGoalColor ? eventColor.style : {}}
                  className={cn(
                    "w-full rounded-lg p-3 text-left transition-all hover:opacity-80",
                    !eventColor.isGoalColor && eventColor.classes?.bg,
                    !eventColor.isGoalColor && eventColor.classes?.text,
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {!event.isAllDay && (
                      <span className="text-xs opacity-75">{format(new Date(event.createdAt), "h:mm a")}</span>
                    )}
                    {event.isAllDay && <span className="text-xs opacity-75">All day</span>}
                    {eventColor.isGoalColor && <Target className="h-3 w-3 opacity-75" />}
                    {event.recurrence && <Repeat className="h-3 w-3 opacity-75" />}
                  </div>
                  <h4 className="font-medium">{event.title}</h4>
                  {eventColor.isGoalColor && eventColor.goalTitle && (
                    <p className="text-xs opacity-60 mt-1">Goal: {eventColor.goalTitle}</p>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No events for this day</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent"
              onClick={() => onCreateEvent?.(currentDate)}
            >
              <Plus className="h-4 w-4" />
              Add Event
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
