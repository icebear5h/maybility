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
import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"

import type { Occurrence } from "@/types/calendar-types"
import type { DragState } from "@/types/calendar-types"

type MonthViewProps = {
  currentDate: Date
  events: Occurrence[]
  onTimeSlotClick?: (date: string, time: string) => void
  dragState: DragState
  onEventClick: (event: Occurrence) => void
  onMouseDown: (e: React.MouseEvent, eventId: string, type: "move" | "resize-start" | "resize-end", date: string) => void
  containerRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>
  dragOverDate: string | null
  hasDragged?: boolean
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function MonthView({ 
  currentDate, 
  events, 
  onTimeSlotClick, 
  dragState, 
  onEventClick, 
  onMouseDown, 
  containerRefs, 
  dragOverDate,
  hasDragged = false
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const days = eachDayOfInterval({ start: startDate, end: endDate })

  // Create individual droppable zones for each day
  const dayDroppables = days.map((day) => {
    const dayString = format(day, "yyyy-MM-dd")
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { setNodeRef, isOver } = useDroppable({ id: dayString })
    return { dayString, setNodeRef, isOver }
  })

  const handleDayClick = (e: React.MouseEvent, dayString: string) => {
    // Don't create event if clicking on an existing event or during drag
    if (e.target !== e.currentTarget || dragState?.eventId) return
    
    // Default to 9:00 AM for month view clicks
    onTimeSlotClick?.(dayString, "09:00")
  }

  return (
    <div className="grid flex-1 grid-cols-7 grid-rows-[auto_1fr]">
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
      {days.map((day, index) => {
        const dayString = format(day, "yyyy-MM-dd")
        const dayEvents = events.filter((event) => {
          const eventDate = new Date(event.startUtc).toISOString().split('T')[0]
          return eventDate === dayString
        })
        
        const { setNodeRef, isOver } = dayDroppables[index]
        const isDragOver = dragOverDate === dayString || isOver
        
        return (
          <div
            key={day.toString()}
            ref={(el) => {
              setNodeRef(el)
              if (el) {
                containerRefs.current[dayString] = el
              }
            }}
            data-date={dayString}
            onClick={(e) => handleDayClick(e, dayString)}
            className={cn(
              "min-h-[120px] border-b border-r border-stone-300/60 p-1 relative cursor-pointer transition-colors duration-200",
              !isSameMonth(day, currentDate) && "bg-stone-50 text-stone-400",
              isSameMonth(day, currentDate) && "bg-white",
              isToday(day) && "bg-blue-50",
              isDragOver && "bg-green-50 border-green-300 border-2 border-dashed"
            )}
          >
            {/* Day number */}
            <div className={cn(
              "text-sm font-medium mb-1",
              isToday(day) ? "text-blue-600" : "text-stone-700"
            )}>
              {format(day, "d")}
            </div>
            
            {/* Events */}
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((event) => {
                const isDragging = dragState?.eventId === event.id
                
                return (
                  <div
                    key={event.id}
                    className={cn(
                      "relative rounded px-2 py-1 text-xs font-medium cursor-grab",
                      "hover:shadow-sm transition-shadow duration-150",
                      isDragging && "opacity-50 cursor-grabbing"
                    )}
                    style={{
                      backgroundColor: event.color || "#3b82f6",
                      color: "white",
                      zIndex: isDragging ? 1000 : 10,
                    }}
                    onMouseDown={(e) => onMouseDown?.(e, event.id, "move", dayString)}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!hasDragged) {
                        onEventClick(event)
                      }
                    }}
                  >
                    <div className="truncate">{event.title}</div>
                    {event.startUtc && (
                      <div className="text-xs opacity-90">
                        {new Date(event.startUtc).toLocaleTimeString([], { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* More events indicator */}
            {dayEvents.length > 3 && (
              <div className="text-xs text-stone-500 mt-1 px-1">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
