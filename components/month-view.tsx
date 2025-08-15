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
import { DayCell } from "@/components/day-cell"
import type { CalendarEvent } from "@/lib/types"

type MonthViewProps = {
  currentDate: Date
  events: CalendarEvent[]
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function MonthView({ currentDate, events }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const days = eachDayOfInterval({ start: startDate, end: endDate })

  return (
    <div className="grid flex-1 grid-cols-7 grid-rows-[auto_1fr]">
      {WEEKDAYS.map((day) => (
        <div
          key={day}
          className="border-b border-r border-stone-300/60 py-2 text-center text-sm font-medium text-stone-500"
        >
          {day}
        </div>
      ))}
      {days.map((day) => {
        const dayEvents = events.filter((event) => event.date === format(day, "yyyy-MM-dd"))
        return (
          <DayCell
            key={day.toString()}
            day={day}
            isCurrentMonth={isSameMonth(day, currentDate)}
            isToday={isToday(day)}
            events={dayEvents}
          />
        )
      })}
    </div>
  )
}
