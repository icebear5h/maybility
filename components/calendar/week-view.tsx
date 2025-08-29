"use client"

import type React from "react"
import { useDroppable } from "@dnd-kit/core"

import { format, startOfWeek, addDays, isToday } from "date-fns"
import { cn } from "@/lib/utils"
import type { Occurrence } from "@/types/calendar-types"

type WeekViewProps = {
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
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// Convert time string to minutes from midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

// Calculate event position and height for time-based layout
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

export function WeekView({
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
}: WeekViewProps) {
  const weekStart = startOfWeek(currentDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const { setNodeRef: setWeekNodeRef } = useDroppable({
    id: "week-view",
  })

  const day0String = format(weekDays[0], "yyyy-MM-dd")
  const day1String = format(weekDays[1], "yyyy-MM-dd")
  const day2String = format(weekDays[2], "yyyy-MM-dd")
  const day3String = format(weekDays[3], "yyyy-MM-dd")
  const day4String = format(weekDays[4], "yyyy-MM-dd")
  const day5String = format(weekDays[5], "yyyy-MM-dd")
  const day6String = format(weekDays[6], "yyyy-MM-dd")

  const { setNodeRef: setDay0NodeRef, isOver: isDay0Over } = useDroppable({ id: day0String })
  const { setNodeRef: setDay1NodeRef, isOver: isDay1Over } = useDroppable({ id: day1String })
  const { setNodeRef: setDay2NodeRef, isOver: isDay2Over } = useDroppable({ id: day2String })
  const { setNodeRef: setDay3NodeRef, isOver: isDay3Over } = useDroppable({ id: day3String })
  const { setNodeRef: setDay4NodeRef, isOver: isDay4Over } = useDroppable({ id: day4String })
  const { setNodeRef: setDay5NodeRef, isOver: isDay5Over } = useDroppable({ id: day5String })
  const { setNodeRef: setDay6NodeRef, isOver: isDay6Over } = useDroppable({ id: day6String })

  const dayNodeRefs = [
    setDay0NodeRef,
    setDay1NodeRef,
    setDay2NodeRef,
    setDay3NodeRef,
    setDay4NodeRef,
    setDay5NodeRef,
    setDay6NodeRef,
  ]

  const dayIsOverStates = [isDay0Over, isDay1Over, isDay2Over, isDay3Over, isDay4Over, isDay5Over, isDay6Over]

  const handleDragOver = (e: React.DragEvent, dayString: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const dropY = e.clientY - rect.top
    const element = document.querySelector(`[data-date="${dayString}"]`)
    if (element) {
      element.setAttribute("data-drop-y", dropY.toString())
      element.setAttribute("data-container-height", rect.height.toString())
    }
  }

  // Handle grid click to create new events
  const handleGridClick = (e: React.MouseEvent, dayString: string) => {
    if (dragState?.eventId) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    
    // Calculate the time from click position
    const clickPercent = clickY / rect.height
    const totalMinutes = clickPercent * 24 * 60
    const hours = Math.floor(totalMinutes / 60)
    const minutes = Math.floor((totalMinutes % 60) / 15) * 15 // Round to nearest 15 minutes
    const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
    
    onTimeSlotClick?.(dayString, timeString)
  }

  return (
    <div className="flex flex-col h-full bg-white" ref={setWeekNodeRef}>
      <div className="grid grid-cols-8 border-b-2 border-stone-300 bg-stone-50">
        <div className="p-3 text-sm font-semibold text-stone-600 border-r border-stone-300 bg-stone-100">Time</div>
        {weekDays.map((day, index) => {
          const dateString = format(day, "yyyy-MM-dd")
          const isDragOver = dragOverDate === dateString || dayIsOverStates[index]

          return (
            <div
              key={day.toString()}
              className={cn(
                "p-3 text-center border-r border-stone-300 last:border-r-0 min-h-[60px] flex flex-col justify-center",
                isToday(day) && "bg-blue-50 border-blue-200",
                isDragOver && "bg-green-100 border-green-300",
              )}
            >
              <div className="text-xs text-stone-500 uppercase tracking-wide font-medium">{WEEKDAYS[index]}</div>
              <div className={cn("text-xl font-bold mt-1", isToday(day) ? "text-blue-600" : "text-stone-800")}>
                {format(day, "d")}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex-1 overflow-auto bg-white">
        <div className="grid grid-cols-8 relative">
          {/* Time column with padding above/below */}
          <div className="border-r-2 border-stone-300 bg-stone-50 relative" style={{ minHeight: '1680px' }}>
            {/* Top padding area */}
            <div className="h-20 border-b border-stone-200 bg-stone-100/50"></div>
            
            {/* Hour labels */}
            <div className="relative" style={{ height: '1440px' }}>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-3 text-xs text-stone-600 font-medium bg-stone-50 px-1"
                  style={{
                    top: `${(hour / 24) * 100}%`,
                    transform: "translateY(-50%)",
                  }}
                >
                  {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                </div>
              ))}
            </div>
            
            {/* Bottom padding area */}
            <div className="h-20 border-t border-stone-200 bg-stone-100/50"></div>
          </div>

          {weekDays.map((day, dayIndex) => {
            const dayString = format(day, "yyyy-MM-dd")
            const dayEvents = events.filter((event) => {
            const eventDate = new Date(event.startUtc).toISOString().split('T')[0]
            return eventDate === dayString
          })
            const isDragOver = dragOverDate === dayString || dayIsOverStates[dayIndex]

            const setDayNodeRef = dayNodeRefs[dayIndex]

            return (
              <div
                key={day.toString()}
                className={cn(
                  "border-r border-stone-300 last:border-r-0 relative",
                  isDragOver && "bg-green-50",
                )}
                style={{ minHeight: '1680px' }}
                ref={(el) => {
                  setDayNodeRef(el)
                  if (containerRefs) {
                    containerRefs.current[dayString] = el
                  }
                }}
                data-date={dayString}
                onClick={(e) => handleGridClick(e, dayString)}
                onDragOver={(e) => handleDragOver(e, dayString)}
              >
                {/* Top padding area */}
                <div className="h-20 border-b border-stone-200 bg-stone-50/30"></div>
                
                {/* Main 24-hour grid */}
                <div className="relative" style={{ height: '1440px' }}>
                  {HOURS.map((hour) => (
                    <div
                      key={`hour-${hour}`}
                      className="absolute left-0 right-0 border-b border-stone-300"
                      style={{
                        top: `${(hour / 24) * 100}%`,
                        height: "1px",
                        pointerEvents: "none",
                      }}
                    />
                  ))}

                  {show15MinGrid &&
                    Array.from({ length: 24 * 4 }, (_, i) => (
                      <div
                        key={`quarter-${i}`}
                        className="absolute left-0 right-0 border-b"
                        style={{
                          top: `${(i / (24 * 4)) * 100}%`,
                          height: "1px",
                          borderColor: i % 4 === 0 ? "#d1d5db" : "#f3f4f6",
                          pointerEvents: "none",
                        }}
                      />
                    ))}

                  {/* Events */}
                  {dayEvents.map((event) => {
                    const startTime = new Date(event.startUtc).toTimeString().slice(0, 5)
                  const endTime = new Date(event.endUtc).toTimeString().slice(0, 5)
                  const eventStyle = getEventStyle(startTime, endTime)
                    const isDragging = dragState?.eventId === event.id

                    return (
                      <div
                        key={event.id}
                        className="absolute left-1 right-1 z-10"
                        style={{
                          ...eventStyle,
                          background:
                            event.color === "blue"
                              ? "#1e40af"
                              : event.color === "green"
                                ? "#16a34a"
                                : event.color === "red"
                                  ? "#dc2626"
                                  : "#7c3aed",
                          color: "white",
                          padding: "2px 4px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          overflow: "hidden",
                          zIndex: isDragging ? 1000 : 10,
                          cursor: isDragging ? "grabbing" : "grab",
                          opacity: isDragging ? 0.8 : 1,
                          userSelect: "none",
                          minHeight: "16px",
                        }}
                        onMouseDown={(e) => onMouseDown?.(e, event.id, "move", dayString)}
                        onClick={(e) => {
                          e.stopPropagation()
                          // Don't open event details if we just finished dragging
                          if (!hasDragged) {
                            onEventClick?.(event)
                          }
                        }}
                      >
                        {/* Resize handle - top */}
                        <div
                          className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize bg-transparent"
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            onMouseDown?.(e, event.id, "resize-start", dayString)
                          }}
                        />

                        {/* Event content */}
                        <div className="font-medium text-xs pointer-events-none">{event.title}</div>
                                            <div className="text-xs opacity-90 pointer-events-none">
                        {startTime} - {endTime}
                      </div>

                        {/* Resize handle - bottom */}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize bg-transparent"
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            onMouseDown?.(e, event.id, "resize-end", dayString)
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
                
                {/* Bottom padding area */}
                <div className="h-20 border-t border-stone-200 bg-stone-50/30"></div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
