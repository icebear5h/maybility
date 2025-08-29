import { useDroppable } from "@dnd-kit/core"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { Occurrence } from "@/types/calendar-types"
import { EventCard } from "@/components/calendar/event-card"

type DayCellProps = {
  day: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: Occurrence[]
}

export function DayCell({ day, isCurrentMonth, isToday, events }: DayCellProps) {
  const dateString = format(day, "yyyy-MM-dd")
  const { setNodeRef, isOver } = useDroppable({
    id: dateString,
  })

  const eventDensity = Math.min(events.length / 3, 1) // Cap at 1 for full opacity

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative border-b border-r border-stone-300/60 p-1.5 transition-colors duration-200",
        isCurrentMonth ? "bg-transparent" : "bg-stone-100/50",
        isOver && "bg-accent-green/20",
      )}
      style={{
        backgroundColor: isCurrentMonth && events.length > 0 ? `rgba(34, 87, 73, ${eventDensity * 0.1})` : undefined,
      }}
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full text-sm",
          isToday && "bg-accent-terracotta text-white",
          !isToday && !isCurrentMonth && "text-stone-400",
          !isToday && isCurrentMonth && "text-stone-600",
        )}
      >
        {format(day, "d")}
      </span>
      <div className="mt-1 space-y-1">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  )
}
