"use client"

import { format, isToday, getHours, getMinutes, addMinutes } from "date-fns"
import type { Event } from "@/lib/types"
import { cn } from "@/lib/utils"
import { entryOccursOnDate, calculateEventColumns } from "@/lib/calendar-utils"
import { EventCard } from "./event-card"
import { AllDayEventBanner } from "./all-day-event-banner"

const HOUR_HEIGHT = 60

interface WeekViewProps {
  weekDays: Date[]
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

export function WeekView({
  weekDays,
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
}: WeekViewProps) {
  const getEventsForDate = (date: Date): any[] => {
    return events.filter((event) => entryOccursOnDate(event, date))
  }

  const getAllDayEvents = (date: Date): any[] => {
    return getEventsForDate(date).filter((event) => event.isAllDay)
  }

  const getTimedEvents = (date: Date): any[] => {
    return getEventsForDate(date).filter((event) => !event.isAllDay)
  }

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      onMouseMove={resizingEvent ? onResizeMove : undefined}
      onMouseUp={resizingEvent ? onResizeEnd : undefined}
      onMouseLeave={resizingEvent ? onResizeEnd : undefined}
    >
      <div className="border-b border-border/50">
        <div className="grid grid-cols-8">
          <div className="w-16 shrink-0 border-r border-border/30" />
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "flex flex-col items-center py-2 border-r border-border/30",
                isToday(day) && "bg-primary/5",
              )}
            >
              <span className="text-xs text-muted-foreground uppercase">{format(day, "EEE")}</span>
              <span
                className={cn(
                  "text-2xl font-light mt-0.5",
                  isToday(day) &&
                    "bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center",
                )}
              >
                {format(day, "d")}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-8 min-h-[32px]">
          <div className="w-16 shrink-0 border-r border-border/30 text-xs text-muted-foreground text-right pr-2 py-1">
            GMT-05
          </div>
          {weekDays.map((day) => {
            const allDayEvents = getAllDayEvents(day)
            return (
              <div
                key={day.toISOString()}
                className={cn("border-r border-border/30 p-0.5 min-h-[32px]", isToday(day) && "bg-primary/5")}
              >
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
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {Array.from({ length: 24 }, (_, hour) => (
            <div
              key={hour}
              className="absolute w-full border-b border-border/30 grid grid-cols-8"
              style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
            >
              <div className="w-16 shrink-0 pr-2 text-right border-r border-border/30">
                <span className="text-xs text-muted-foreground relative -top-2">
                  {hour === 0 ? "" : format(new Date().setHours(hour, 0), "h a")}
                </span>
              </div>
              {weekDays.map((day) => {
                const cellId = `${format(day, "yyyy-MM-dd")}-${hour}`
                const isDropTargetCell = dropTarget === cellId

                return (
                  <div
                    key={day.toISOString()}
                    onDragOver={(e) => onDragOver(e, cellId)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => {
                      // Calculate exact minute based on mouse position
                      const rect = e.currentTarget.getBoundingClientRect()
                      const y = e.clientY - rect.top
                      const minuteInHour = Math.round((y / HOUR_HEIGHT) * 60 / 5) * 5 // Round to nearest 5 minutes
                      const snappedMinute = Math.min(55, Math.max(0, minuteInHour))

                      const newDate = new Date(day)
                      newDate.setHours(hour, snappedMinute, 0, 0)
                      onDrop(e, newDate) // Don't pass hour - let it use the fully calculated date
                    }}
                    onClick={(e) => {
                      // Calculate exact minute based on click position
                      const rect = e.currentTarget.getBoundingClientRect()
                      const y = e.clientY - rect.top
                      const minuteInHour = Math.round((y / HOUR_HEIGHT) * 60 / 5) * 5 // Round to nearest 5 minutes
                      const snappedMinute = Math.min(55, Math.max(0, minuteInHour))

                      const newDate = new Date(day)
                      newDate.setHours(hour, snappedMinute, 0, 0)
                      onCreateEvent?.(newDate)
                    }}
                    className={cn(
                      "border-r border-border/30 cursor-pointer hover:bg-muted/20 relative",
                      isToday(day) && "bg-primary/5",
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
                )
              })}
            </div>
          ))}

          <div className="absolute inset-0 grid grid-cols-8 pointer-events-none">
            <div className="w-16 shrink-0" />
            {weekDays.map((day) => {
              const timedEvents = getTimedEvents(day)
              const positions = calculateEventColumns(timedEvents)

              return (
                <div key={day.toISOString()} className="relative border-r border-transparent">
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
                    const width = `calc(${100 / pos.totalColumns}% - 4px)`
                    const left = `calc(${(pos.column / pos.totalColumns) * 100}% + 2px)`

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
              )
            })}
          </div>

          {weekDays.some((day) => isToday(day)) && (
            <div
              className="absolute left-16 right-0 flex items-center z-40 pointer-events-none"
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
  )
}
