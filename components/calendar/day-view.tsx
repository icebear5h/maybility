"use client"

import type React from "react"
import { useDroppable } from "@dnd-kit/core"

import { format, isToday } from "date-fns"
import { cn } from "@/lib/utils"
import type { Occurrence } from "@/types/calendar-types"

type DayViewProps = {
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
  const heightPercent = Math.max((duration / (24 * 60)) * 100, 3)

  return {
    top: `${topPercent}%`,
    height: `${heightPercent}%`,
  }
}

export function DayView({
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
}: DayViewProps) {
  const dateString = format(currentDate, "yyyy-MM-dd")
  const dayEvents = events.filter((event) => {
    const eventDate = new Date(event.startUtc).toISOString().split('T')[0]
    return eventDate === dateString
  })

  const { setNodeRef, isOver } = useDroppable({
    id: dateString,
  })

  const handleDragOver = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const dropY = e.clientY - rect.top
    const element = document.querySelector(`[data-date="${dateString}"]`)
    if (element) {
      element.setAttribute("data-drop-y", dropY.toString())
      element.setAttribute("data-container-height", rect.height.toString())
    }
  }

  const handleGridClick = (e: React.MouseEvent) => {
    if (dragState?.eventId) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    
    // Calculate the time from click position
    const clickPercent = clickY / rect.height
    const totalMinutes = clickPercent * 24 * 60
    const hours = Math.floor(totalMinutes / 60)
    const minutes = Math.floor((totalMinutes % 60) / 15) * 15 // Round to nearest 15 minutes
    const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
    
    onTimeSlotClick?.(dateString, timeString)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Day header */}
      <div
        className={cn(
          "p-4 border-b border-stone-300 text-center",
          isToday(currentDate) && "bg-accent-terracotta/10",
          (dragOverDate === dateString || isOver) && "bg-accent-green/20",
        )}
      >
        <div className="text-sm text-stone-500 uppercase tracking-wide">{format(currentDate, "EEEE")}</div>
        <div
          className={cn("text-2xl font-bold mt-1", isToday(currentDate) ? "text-accent-terracotta" : "text-stone-700")}
        >
          {format(currentDate, "MMMM d, yyyy")}
        </div>
        {dayEvents.length > 0 && (
          <div className="text-sm text-stone-600 mt-2">
            {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""} scheduled
          </div>
        )}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div
          className="relative"
          ref={(el) => {
            setNodeRef(el)
            if (containerRefs) {
              containerRefs.current[dateString] = el
            }
          }}
          data-date={dateString}
          onClick={handleGridClick}
          onDragOver={handleDragOver}
          style={{
            height: "1920px",
            background: dragOverDate === dateString || isOver ? "rgba(34, 87, 73, 0.2)" : "transparent",
            cursor: dragState?.eventId ? "default" : "pointer",
          }}
        >
          <div className="flex h-full pt-4">
            {/* Time labels */}
            <div className="w-20 border-r border-stone-200 relative pointer-events-none">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-2 text-sm text-stone-500 font-medium"
                  style={{
                    top: `${(hour / 24) * 100}%`,
                    transform: "translateY(-8px)",
                  }}
                >
                  {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                </div>
              ))}
            </div>

            {/* Main time container */}
            <div className="flex-1 relative pointer-events-none">
              {dayEvents.map((event) => {
                const startTime = new Date(event.startUtc).toTimeString().slice(0, 5)
                const endTime = new Date(event.endUtc).toTimeString().slice(0, 5)
                const eventStyle = getEventStyle(startTime, endTime)
                const isDragging = dragState?.eventId === event.id

                return (
                  <div
                    key={event.id}
                    className="absolute z-10 pointer-events-auto"
                    style={{
                      ...eventStyle,
                      top: `calc(${eventStyle.top} + 16px)`,
                      left: "8px", // Small margin from left edge
                      right: "8px", // Small margin from right edge
                      background:
                        event.color === "blue"
                          ? "#1e40af"
                          : event.color === "green"
                            ? "#16a34a"
                            : event.color === "red"
                              ? "#dc2626"
                              : "#7c3aed",
                      color: "white",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "14px",
                      overflow: "hidden",
                      zIndex: isDragging ? 1000 : 10,
                      minHeight: "30px",
                      cursor: isDragging ? "grabbing" : "grab",
                      opacity: isDragging ? 0.8 : 1,
                      userSelect: "none",
                    }}
                    onMouseDown={(e) => onMouseDown?.(e, event.id, "move", dateString)}
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
                      className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize bg-transparent"
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        onMouseDown?.(e, event.id, "resize-start", dateString)
                      }}
                    />

                    {/* Event content */}
                    <div className="font-medium mb-1 pointer-events-none">{event.title}</div>
                    <div className="text-xs opacity-90 pointer-events-none">
                      {startTime} - {endTime}
                    </div>

                    {/* Resize handle - bottom */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize bg-transparent"
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        onMouseDown?.(e, event.id, "resize-end", dateString)
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Hour grid lines */}
          {HOURS.map((hour) => (
            <div
              key={`hour-${hour}`}
              className="absolute border-b border-stone-400"
              style={{
                left: "80px",
                right: "0",
                top: `calc(${(hour / 24) * 100}% + 16px)`,
                height: "1px",
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Quarter-hour grid lines */}
          {Array.from({ length: 24 * 4 }, (_, i) => {
            if (i % 4 === 0) return null // Skip hour lines
            return (
              <div
                key={`quarter-${i}`}
                className="absolute border-b border-stone-200"
                style={{
                  left: "80px",
                  right: "0",
                  top: `calc(${(i / (24 * 4)) * 100}% + 16px)`,
                  height: "1px",
                  pointerEvents: "none",
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
