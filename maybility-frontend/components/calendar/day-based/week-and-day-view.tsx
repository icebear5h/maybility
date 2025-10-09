"use client"

import type React from "react"
import { format, startOfWeek, addDays } from "date-fns"
import type { Occurrence } from "@/types/calendar-types"
import { EventCard } from "@/components/calendar/events/event-card"

type WeekAndDayViewProps = {
  view: "week" | "day"
  currentDate: Date
  events: Occurrence[]
  onTimeSlotClick?: (date: string, time: string) => void
  onEventClick?: (event: Occurrence) => void
  onEventDrag?: (
    event: Occurrence,
    dragType: "start" | "end" | "move",
    deltaMinutes: number,
    newDate?: string,
    isComplete?: boolean,
  ) => void // Add drag handler prop
  show15MinGrid?: boolean
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const QUARTER_HOURS = Array.from({ length: 24 * 4 }, (_, i) => i * 15)

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

const snapToFiveMinutes = (minutes: number): number => {
  return Math.round(minutes / 5) * 5
}

const getEventStyle = (startTime: string, endTime: string) => {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  const duration = endMinutes - startMinutes

  const topPercent = (startMinutes / (24 * 60)) * 100
  const heightPercent = Math.max((duration / (24 * 60)) * 100, 2)

  return {
    top: `${topPercent}%`,
    height: `${heightPercent}%`,
  }
}

function WeekEvent({
  event,
  onEventClick,
  onEventDrag,
  style,
}: {
  event: Occurrence
  onEventClick?: (event: Occurrence) => void
  onEventDrag?: (
    event: Occurrence,
    dragType: "start" | "end" | "move",
    deltaMinutes: number,
    newDate?: string,
    isComplete?: boolean,
  ) => void
  style: React.CSSProperties
}) {
  return (
    <div
      className="absolute z-10"
      style={{
        ...style,
        left: "4px",
        right: "4px",
      }}
    >
      <EventCard
        event={event}
        timeBased={true}
        onEventClick={onEventClick}
        onEventDrag={onEventDrag}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      />
    </div>
  )
}

function TimeSlot({
  dayString,
  children,
  onTimeSlotClick,
}: {
  dayString: string
  children: React.ReactNode
  onTimeSlotClick?: (date: string, time: string) => void
}) {
  const handleTimeSlotClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const clickPercent = clickY / rect.height
    const totalMinutes = clickPercent * 24 * 60
    const snappedMinutes = snapToFiveMinutes(totalMinutes)
    const hours = Math.floor(snappedMinutes / 60)
    const minutes = snappedMinutes % 60
    const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`

    onTimeSlotClick?.(dayString, timeString)
  }

  return (
    <div
      className="relative h-full"
      style={{
        height: "1440px",
        background: "white",
        cursor: "pointer",
      }}
      onClick={handleTimeSlotClick}
    >
      {children}
    </div>
  )
}

export function WeekAndDayView({
  view,
  currentDate,
  events,
  onTimeSlotClick,
  onEventClick,
  onEventDrag, // Accept drag handler
  show15MinGrid = false,
}: WeekAndDayViewProps) {
  const weekStart = startOfWeek(currentDate)
  let weekDays: Date[]
  if (view === "day") {
    weekDays = [currentDate]
  } else {
    weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }

  const daysGridColsClass = view === "day" ? "grid-cols-1" : "grid-cols-7"
  const TIME_COL_WIDTH_CLASS = "w-20"

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Header */}
      <div className="flex border-b-2 border-stone-300 bg-stone-50">
        <div
          className={`${TIME_COL_WIDTH_CLASS} p-3 text-sm font-semibold text-stone-600 border-r border-stone-300 bg-stone-100 shrink-0`}
        >
          Time
        </div>
        <div className={`grid ${daysGridColsClass} flex-1 min-w-0`}>
          {weekDays.map((day) => (
            <div
              key={day.toString()}
              className="p-3 text-center border-r border-stone-300 last:border-r-0 min-h-[60px] flex flex-col justify-center"
            >
              <div className="text-xs text-stone-500 uppercase tracking-wide font-medium">{format(day, "EEE")}</div>
              <div className="text-xl font-bold mt-1 text-stone-800">{format(day, "d")}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto min-h-0 bg-white [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex relative min-w-0">
          {/* Time column */}
          <div
            className={`${TIME_COL_WIDTH_CLASS} border-r-2 border-stone-300 bg-stone-50 relative shrink-0 sticky left-0 z-10`}
          >
            <div className="h-20 border-b border-stone-200 bg-stone-100/50" />
            <div className="relative" style={{ height: "1440px" }}>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-3 text-xs text-stone-600 font-medium bg-stone-50 px-1"
                  style={{
                    top: `${hour * 60}px`,
                    transform: "translateY(-50%)",
                  }}
                >
                  {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                </div>
              ))}
            </div>
            <div className="h-20 border-t border-stone-200 bg-stone-100/50" />
          </div>

          {/* Day columns grid */}
          <div className={`grid ${daysGridColsClass} flex-1 min-w-0`}>
            {weekDays.map((day) => {
              const dayString = format(day, "yyyy-MM-dd")
              const dayEvents = events.filter((event) => {
                if (!event.date) return false
                const eventDate = event.date instanceof Date ? event.date : new Date(event.date)
                if (isNaN(eventDate.getTime())) return false
                return format(eventDate, "yyyy-MM-dd") === dayString
              })

              return (
                <div key={day.toString()} className="border-r border-stone-300 last:border-r-0 relative">
                  <div className="h-20 border-b border-stone-200 bg-stone-50/30" />

                  <TimeSlot dayString={dayString} onTimeSlotClick={onTimeSlotClick}>
                    <div data-day-iso={dayString} className="absolute inset-0">
                      {HOURS.map((hour) => (
                        <div
                          key={`hour-${hour}`}
                          className="absolute left-0 right-0 border-t border-stone-300 pointer-events-none z-0"
                          style={{
                            top: `${hour * 60}px`,
                          }}
                        />
                      ))}

                      {show15MinGrid &&
                        QUARTER_HOURS.map((minutes) => {
                          if (minutes % 60 === 0) return null
                          return (
                            <div
                              key={`quarter-${minutes}`}
                              className="absolute left-0 right-0 border-t border-stone-200 pointer-events-none z-0"
                              style={{
                                top: `${minutes}px`,
                              }}
                            />
                          )
                        })}

                      {dayEvents.map((event) => {
                        // Use the new date/startTime/endTime structure
                        const startTime = event.startTime
                        const endTime = event.endTime
                        const eventStyle = getEventStyle(startTime, endTime)

                        return (
                          <WeekEvent
                            key={event.id}
                            event={event}
                            onEventClick={onEventClick}
                            onEventDrag={onEventDrag}
                            style={eventStyle}
                          />
                        )
                      })}
                    </div>
                  </TimeSlot>

                  <div className="h-20 border-t border-stone-200 bg-stone-50/30" />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
