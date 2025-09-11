"use client"

import type React from "react"
import { useDroppable } from "@dnd-kit/core"
import { format, isToday } from "date-fns"
import { cn } from "@/lib/utils"
import type { Occurrence } from "@//types/calendar-types"
import { EventCard } from "@/components/calendar/events/event-card"

type DayColumnProps = {
  date: Date
  events: Occurrence[]
  onTimeSlotClick?: (date: string, time: string) => void
  onEventClick?: (event: Occurrence) => void
  show15MinGrid?: boolean
  dragState?: any
  onMouseDown?: (e: React.MouseEvent, eventId: string, type: any, date: string) => void
  containerRefs?: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>
  dragOverDate?: string | null
  hasDragged?: boolean
  showHeader?: boolean
  headerFormat?: "day" | "week"
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
  const heightPercent = Math.max((duration / (24 * 60)) * 100, 2)

  return {
    top: `${topPercent}%`,
    height: `${heightPercent}%`,
  }
}

export function DayColumn({
  date,
  events,
  onTimeSlotClick,
  onEventClick,
  show15MinGrid = false,
  dragState,
  onMouseDown,
  containerRefs,
  dragOverDate,
  hasDragged = false,
  showHeader = true,
  headerFormat = "day"
}: DayColumnProps) {
  const dateString = format(date, "yyyy-MM-dd")
  const { setNodeRef, isOver } = useDroppable({
    id: dateString,
  })

  // Additional droppable for time-based interactions
  const { setNodeRef: setTimeNodeRef } = useDroppable({
    id: `${dateString}-time`,
  })

  const isDragOver = dragOverDate === dateString || isOver

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
      {/* Day header - conditional */}
      {showHeader && (
        <div
          className={cn(
            "p-4 border-b border-stone-300 text-center",
            headerFormat === "day" && "bg-white",
            headerFormat === "week" && "bg-stone-50",
            isToday(date) && "bg-accent-terracotta/10",
            isDragOver && "bg-accent-green/20",
          )}
        >
          {headerFormat === "day" ? (
            <>
              <div className="text-sm text-stone-500 uppercase tracking-wide">{format(date, "EEEE")}</div>
              <div
                className={cn("text-2xl font-bold mt-1", isToday(date) ? "text-accent-terracotta" : "text-stone-700")}
              >
                {format(date, "MMMM d, yyyy")}
              </div>
              {events.length > 0 && (
                <div className="text-sm text-stone-600 mt-2">
                  {events.length} event{events.length !== 1 ? "s" : ""} scheduled
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-xs text-stone-500 uppercase tracking-wide font-medium">{format(date, "EEE")}</div>
              <div className={cn("text-xl font-bold mt-1", isToday(date) ? "text-blue-600" : "text-stone-800")}>
                {format(date, "d")}
              </div>
            </>
          )}
        </div>
      )}

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
            height: headerFormat === "day" ? "1920px" : "1440px",
            background: isDragOver ? "rgba(34, 87, 73, 0.2)" : "transparent",
            cursor: dragState?.eventId ? "default" : "pointer",
          }}
        >
          <div className="flex h-full">
            {/* Time labels - only show in day format */}
            {headerFormat === "day" && (
              <div className="w-20 border-r border-stone-200 relative pointer-events-none pt-4">
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
            )}

            {/* Main time container */}
            <div className="flex-1 relative">
              {events.map((event) => {
                const startTime = new Date(event.startUtc).toTimeString().slice(0, 5)
                const endTime = new Date(event.endUtc).toTimeString().slice(0, 5)
                const eventStyle = getEventStyle(startTime, endTime)
                const isDragging = dragState?.eventId === event.id

                return (
                  <EventCard
                    key={event.id}
                    event={event}
                    timeBased={true}
                    style={{
                      ...eventStyle,
                      top: headerFormat === "day" ? `calc(${eventStyle.top} + 16px)` : eventStyle.top,
                      left: headerFormat === "day" ? "8px" : "4px",
                      right: headerFormat === "day" ? "8px" : "4px",
                      padding: headerFormat === "day" ? "8px 12px" : "2px 4px",
                      fontSize: headerFormat === "day" ? "14px" : "11px",
                      minHeight: headerFormat === "day" ? "30px" : "16px",
                    }}
                    onMouseDown={onMouseDown}
                    onEventClick={onEventClick}
                    hasDragged={hasDragged}
                    date={date}
                  />
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
                left: headerFormat === "day" ? "80px" : "0",
                right: "0",
                top: headerFormat === "day" ? `calc(${(hour / 24) * 100}% + 16px)` : `${(hour / 24) * 100}%`,
                height: "1px",
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Quarter-hour grid lines */}
          {show15MinGrid && Array.from({ length: 24 * 4 }, (_, i) => {
            if (i % 4 === 0) return null // Skip hour lines
            return (
              <div
                key={`quarter-${i}`}
                className="absolute border-b border-stone-200"
                style={{
                  left: headerFormat === "day" ? "80px" : "0",
                  right: "0",
                  top: headerFormat === "day" ? `calc(${(i / (24 * 4)) * 100}% + 16px)` : `${(i / (24 * 4)) * 100}%`,
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
