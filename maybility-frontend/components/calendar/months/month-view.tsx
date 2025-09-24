"use client"

import type React from "react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from "date-fns"

import type { Occurrence } from "@/types/calendar-types"
import { DroppableDayCell } from "@/components/calendar/months/droppable-day-cell"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function MonthView({
  currentDate,
  events,
  onTimeSlotClick,
  onEventClick,
  containerRefs,
}: {
  currentDate: Date
  events: Occurrence[]
  onTimeSlotClick?: (date: string, time: string) => void
  onEventClick: (event: Occurrence) => void
  containerRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>
}) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const days = eachDayOfInterval({ start: startDate, end: endDate })

  const handleMouseDown = (
    e: React.MouseEvent,
    eventId: string,
    type: "move" | "resize-start" | "resize-end",
    date: string,
  ) => {
    // This is handled by dnd-kit now
  }

  const handleEventClick = (event: Occurrence) => {
    onEventClick(event)
  }

  return (
    <div className="grid h-full grid-cols-7">
      {/* Weekday headers */}
      {WEEKDAYS.map((day) => (
        <div
          key={day}
          className="border-b border-r border-stone-300/60 py-2 text-center text-sm font-medium text-stone-500"
        >
          {day}
        </div>
      ))}

      {/* Day cells */}
      {days.map((day) => {
        const dayString = format(day, "yyyy-MM-dd")
        const dayEvents = events.filter((event) => {
          if (!event.startUtc) return false
          const eventDate = new Date(event.startUtc)
          if (isNaN(eventDate.getTime())) return false
          const eventLocalDate = format(eventDate, "yyyy-MM-dd")
          return eventLocalDate === dayString
        })

        return (
          <DroppableDayCell
            key={day.toString()}
            dragOverDate={null}
            containerRefs={containerRefs}
            handleMouseDown={handleMouseDown}
            handleEventClick={handleEventClick}
            dragState={null}
            day={day}
            isCurrentMonth={isSameMonth(day, currentDate)}
            isToday={isToday(day)}
            events={dayEvents}
            onTimeSlotClick={onTimeSlotClick}
          />
        )
      })}
    </div>
  )
}
