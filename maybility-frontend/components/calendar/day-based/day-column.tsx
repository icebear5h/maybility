"use client"
import type React from "react"
import { format } from "date-fns"
import type { Occurrence } from "@/types/calendar-types"
import { EventCard } from "@/components/calendar/events/event-card"

const HOURS = Array.from({ length: 24 }, (_, i) => i)

// 1px = 1min (UTC-based)
function getEventStyle(startIso: string, endIso: string) {
  const s = new Date(startIso)
  const e = new Date(endIso)
  const mins = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes()
  const top = mins(s)
  const dur = Math.max(15, mins(e) - mins(s)) // Minimum 15 minutes height
  return { top: `${top}px`, height: `${dur}px`, left: "4px", right: "4px" }
}

export type DayColumnProps = {
  date: Date
  events: Occurrence[]
  onTimeSlotClick?: (dateISO: string, hhmm: string) => void
  onEventClick?: (e: Occurrence) => void
  onEventDrag?: (
    event: Occurrence,
    dragType: "start" | "end" | "move",
    deltaMinutes: number,
    newDate?: string,
    isComplete?: boolean,
  ) => void
  show15MinGrid?: boolean
}

export function DayColumn({ date, events, onTimeSlotClick, onEventClick, onEventDrag, show15MinGrid }: DayColumnProps) {
  const dayISO = format(date, "yyyy-MM-dd")

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onTimeSlotClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top // px
    const minutes = Math.round(y) // 1px=1min
    const snap = Math.round(minutes / 5) * 5 // Snap to 5-minute intervals
    const hh = String(Math.floor(snap / 60)).padStart(2, "0")
    const mm = String(snap % 60).padStart(2, "0")
    onTimeSlotClick(dayISO, `${hh}:${mm}`)
  }

  return (
    <div className="border-r border-stone-300 last:border-r-0 relative">
      <div className="h-20 border-b border-stone-200 bg-stone-50/30" />
      <div
        data-day-iso={dayISO}
        className="relative h-full"
        style={{ height: "1440px", background: "white", cursor: "pointer" }}
        onClick={handleClick}
      >
        {/* hour lines */}
        {HOURS.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-stone-300 pointer-events-none z-0"
            style={{ top: `${h * 60}px` }}
          />
        ))}
        {/* optional 15-min lines */}
        {show15MinGrid &&
          Array.from({ length: 24 * 4 }, (_, i) => i * 15).map((m) =>
            m % 60 === 0 ? null : (
              <div
                key={`q-${m}`}
                className="absolute left-0 right-0 border-t border-stone-200 pointer-events-none z-0"
                style={{ top: `${m}px` }}
              />
            ),
          )}

        {events.map((ev) => (
          <EventCard
            key={ev.id}
            event={ev}
            timeBased={true}
            style={getEventStyle(ev.startUtc, ev.endUtc)}
            onEventClick={onEventClick}
            onEventDrag={onEventDrag}
          />
        ))}
      </div>
      <div className="h-20 border-t border-stone-200 bg-stone-50/30" />
    </div>
  )
}
