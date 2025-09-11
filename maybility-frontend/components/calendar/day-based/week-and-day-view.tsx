"use client"

import type React from "react"
import { useDroppable } from "@dnd-kit/core"
import { format, startOfWeek, addDays } from "date-fns"
import type { Occurrence } from "@//types/calendar-types"
import { DayColumn } from "./day-column"

type WeekAndDayViewProps = {
  view: "week" | "day"
  currentDate: Date
  events: Occurrence[]
  onTimeSlotClick?: (date: string, time: string) => void
  onEventClick?: (event: Occurrence) => void
  show15MinGrid?: boolean
  dragState?: any
  onMouseDown?: (e: React.MouseEvent, eventId: string, type: any, date: string) => void
  containerRefs?: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>
  dragOverDate?: string | null
  hasDragged?: boolean
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function WeekAndDayView({
  view,
  currentDate,
  events,
  onTimeSlotClick,
  onEventClick,
  show15MinGrid = false,
  dragState,
  onMouseDown,
  containerRefs,
  dragOverDate,
  hasDragged = false,
}: WeekAndDayViewProps) {
  const weekStart = startOfWeek(currentDate)
  let weekDays: Date[]
  if (view === "day") {
    weekDays = [currentDate]
  } else {
    weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }

  // Day grid columns only (time column is now separate)
  const daysGridColsClass = view === "day" ? "grid-cols-1" : "grid-cols-7"

  // Single source of truth for time column width
  const TIME_COL_WIDTH_CLASS = "w-20"

  const { setNodeRef: setWeekNodeRef } = useDroppable({
    id: "week-view",
  })

  return (
    <div className="flex flex-col h-full min-h-0 bg-white " ref={setWeekNodeRef}>
      {/* Header */}
      <div className="flex border-b-2 border-stone-300 bg-stone-50">
        <div className={`${TIME_COL_WIDTH_CLASS} p-3 text-sm font-semibold text-stone-600 border-r border-stone-300 bg-stone-100 shrink-0`}>
          Time
        </div>
        <div className={`grid ${daysGridColsClass} flex-1 min-w-0`}>
          {weekDays.map((day) => (
            <div key={day.toString()} className="p-3 text-center border-r border-stone-300 last:border-r-0 min-h-[60px] flex flex-col justify-center">
              <div className="text-xs text-stone-500 uppercase tracking-wide font-medium">{format(day, "EEE")}</div>
              <div className="text-xl font-bold mt-1 text-stone-800">{format(day, "d")}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body (single scroll container) */}
      <div className="flex-1 overflow-auto min-h-0 bg-white scrollbar-none">
        <div className="flex relative min-w-0 scrollbar-none">
          {/* Time column (fixed width; optional sticky) */}
          <div className={`${TIME_COL_WIDTH_CLASS} border-r-2 border-stone-300 bg-stone-50 relative shrink-0 sticky left-0 z-10`}>
            {/* Top padding */}
            <div className="h-20 border-b border-stone-200 bg-stone-100/50" />
            {/* Hour labels track fills available height */}
            <div className="relative h-full scrollbar-none">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-3 text-xs text-stone-600 font-medium bg-stone-50 px-1"
                  style={{
                    // position each label by % of the track height
                    top: `${(hour / 24) * 100}%`,
                    transform: "translateY(-50%)",
                  }}
                >
                  {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                </div>
              ))}
            </div>
            {/* Bottom padding */}
            <div className="h-20 border-t border-stone-200 bg-stone-100/50" />
          </div>

          {/* Day columns grid */}
          <div className={`grid ${daysGridColsClass} flex-1 min-w-0`}>
            {weekDays.map((day) => {
              const dayString = format(day, "yyyy-MM-dd")
              const dayEvents = events.filter((event) => {
                const eventDate = new Date(event.startUtc)
                return format(eventDate, "yyyy-MM-dd") === dayString
              })

              return (
                <div key={day.toString()} className="border-r border-stone-300 last:border-r-0 relative scrollbar-none">
                  {/* Top padding */}
                  <div className="h-20 border-b border-stone-200 bg-stone-50/30" />
                  {/* Day track fills the scroll pane height */}
                  <div className="relative h-full
                                  [background-image:repeating-linear-gradient(to_bottom,transparent,transparent_59px,#e5e7eb_60px)]
                                  bg-[length:100%_60px]">
                    <DayColumn
                      date={day}
                      events={dayEvents}
                      onTimeSlotClick={onTimeSlotClick}
                      data-date={dayString}
                      onEventClick={onEventClick}
                      show15MinGrid={show15MinGrid}
                      dragState={dragState}
                      onMouseDown={onMouseDown}
                      containerRefs={containerRefs}
                      dragOverDate={dragOverDate}
                      hasDragged={hasDragged}
                      showHeader={false}
                      headerFormat="week"
                    />
                  </div>
                  {/* Bottom padding */}
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