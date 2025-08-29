import { useDroppable } from "@dnd-kit/core"
import { format } from "date-fns"
import type { Occurrence } from "@/types/calendar-types"
import { EventCard } from "./event-card"
import { DragState } from "@/types/calendar-types"

export function DroppableDayCell({
  dragOverDate,
  containerRefs,
  handleMouseDown,
  handleEventClick,
  dragState,
  day,
  isCurrentMonth,
  isToday: isDayToday,
  events: dayEvents,
  onTimeSlotClick,
}: {
  dragOverDate: string | null
  containerRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>
  handleMouseDown: (e: React.MouseEvent, eventId: string, type: "move" | "resize-start" | "resize-end", date: string) => void
  handleEventClick: (event: Occurrence) => void
  dragState: DragState
  day: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: Occurrence[]
  onTimeSlotClick?: (date: string, time: string) => void
}) {
  const dateString = format(day, "yyyy-MM-dd")
  const { setNodeRef, isOver } = useDroppable({
    id: dateString,
  })

  const isDragOver = dragOverDate === dateString || isOver

  const handleDayClick = (e: React.MouseEvent) => {
    // Don't create event if clicking on an existing event or during drag
    if (e.target !== e.currentTarget || dragState?.eventId) return
    
    // Default to 9:00 AM for month view clicks
    onTimeSlotClick?.(dateString, "09:00")
  }

  return (
    <div
      ref={(el) => {
        setNodeRef(el)
        if (el) {
          containerRefs.current[dateString] = el
        }
      }}
      data-date={dateString}
      onClick={handleDayClick}
      className={`
        min-h-[120px] border-b border-r border-stone-300/60 p-1 
        ${!isCurrentMonth ? "bg-stone-50 text-stone-400" : "bg-white"} 
        ${isDayToday ? "bg-blue-50" : ""}
        ${isDragOver ? "bg-green-50 border-green-300 border-2 border-dashed" : ""}
        transition-colors duration-200 cursor-pointer
      `}
    >
      <div className={`text-sm font-medium mb-1 ${isDayToday ? "text-blue-600" : ""}`}>
        {format(day, "d")}
      </div>
      
      <div className="space-y-1">
        {dayEvents.slice(0, 3).map((event) => (
          <div
            key={event.id}
            onClick={(e) => {
              e.stopPropagation()
              handleEventClick(event)
            }}
          >
            <EventCard 
              event={event} 
              compact={true}
            />
          </div>
        ))}
      </div>

      {dayEvents.length > 3 && (
        <div className="text-xs text-stone-500 mt-1 px-1">
          +{dayEvents.length - 3} more
        </div>
      )}
    </div>
  )
}