"use client"

import type React from "react"
import { forwardRef, useState, useRef } from "react"
import { useDraggable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import type { Occurrence } from "@/types/calendar-types"

type EventCardProps = {
  event: Occurrence
  timeBased?: boolean
  style?: React.CSSProperties
  onEventClick?: (event: Occurrence) => void
  onEventDrag?: (
    event: Occurrence,
    dragType: "start" | "end" | "move",
    deltaMinutes: number,
    newDate?: string,
    isComplete?: boolean,
  ) => void
  date?: Date
} & React.HTMLAttributes<HTMLDivElement>

export const EventCard = forwardRef<HTMLDivElement, EventCardProps>(
  ({ event, timeBased = false, style, onEventClick, onEventDrag, date, ...props }, ref) => {
    const [isDragging, setIsDragging] = useState(false)
    const [dragType, setDragType] = useState<"start" | "end" | "move" | null>(null)
    const dragStartY = useRef(0)
    const dragStartDate = useRef<string>("")
    const eventRef = useRef<HTMLDivElement | null>(null)
    const dragThreshold = 3 // pixels
    const hasDraggedRef = useRef(false)
    const finalDeltaRef = useRef(0)
    const finalNewDateRef = useRef<string | undefined>(undefined)
    const dragTypeRef = useRef<"start" | "end" | "move" | null>(null)

    const sourceDate = date ? date.toISOString().split("T")[0] : ""
    const {
      attributes,
      listeners,
      setNodeRef: setDraggableNodeRef,
      transform,
      isDragging: isDndKitDragging,
    } = useDraggable({
      id: event.id,
      data: {
        type: "event",
        event: event,
        sourceDate: sourceDate,
      },
      disabled: timeBased, // Only enable dnd-kit for month view (non-time-based)
    })

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!hasDraggedRef.current && onEventClick) {
        console.log("[v0] EventCard clicked - opening modal")
        onEventClick(event)
      } else if (hasDraggedRef.current) {
        console.log("[v0] EventCard click prevented - drag detected")
      }
    }

    const handleMouseDown = (e: React.MouseEvent, type: "start" | "end" | "move") => {
      e.preventDefault()
      e.stopPropagation()

      setIsDragging(true)
      setDragType(type)
      dragTypeRef.current = type
      dragStartY.current = e.clientY
      hasDraggedRef.current = false
      finalDeltaRef.current = 0
      finalNewDateRef.current = undefined

      // Store the original date for cross-day dragging
      const eventDate = new Date(event.startUtc)
      dragStartDate.current = eventDate.toISOString().split("T")[0]

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!onEventDrag) return

        const deltaY = moveEvent.clientY - dragStartY.current

        if (Math.abs(deltaY) < dragThreshold && !hasDraggedRef.current) {
          return
        }

        hasDraggedRef.current = true
        const deltaMinutes = deltaY // 1px = 1 minute in our calendar

        finalDeltaRef.current = deltaMinutes

        // For move operations, check if we're dragging to a different day
        let newDate: string | undefined
        if (type === "move") {
          const calendarElement = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)
          const dayColumn = calendarElement?.closest("[data-day-iso]")
          if (dayColumn) {
            newDate = dayColumn.getAttribute("data-day-iso") || undefined
            finalNewDateRef.current = newDate
          }
        }

        onEventDrag(event, type, deltaMinutes, newDate, false)
      }

      const handleMouseUp = (upEvent: MouseEvent) => {
        const finalDragType = dragTypeRef.current

        console.log("[v0] Mouse up detected, preparing final call")
        console.log("[v0] hasDraggedRef.current:", hasDraggedRef.current)
        console.log("[v0] onEventDrag exists:", !!onEventDrag)
        console.log("[v0] finalDragType:", finalDragType)

        setIsDragging(false)
        setDragType(null)
        dragTypeRef.current = null
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)

        if (hasDraggedRef.current && onEventDrag && finalDragType) {
          console.log("[v0] Final drag values:", {
            deltaMinutes: finalDeltaRef.current,
            newDate: finalNewDateRef.current,
            dragType: finalDragType,
          })

          console.log("[v0] Making final onEventDrag call with isComplete: true")
          onEventDrag(event, finalDragType, finalDeltaRef.current, finalNewDateRef.current, true)
          console.log("[v0] Final onEventDrag call completed")
        } else {
          console.log("[v0] Skipping final call - conditions not met:", {
            hasDragged: hasDraggedRef.current,
            hasCallback: !!onEventDrag,
            hasDragType: !!finalDragType,
          })
        }

        setTimeout(() => {
          hasDraggedRef.current = false
        }, 100)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    const startTime = new Date(event.startUtc).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    const endTime = new Date(event.endUtc).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })

    const eventHeight = style?.height ? Number.parseInt(style.height.toString()) : 0
    const isSmallEvent = eventHeight < 60 // Less than 60px height is considered small

    const dndKitStyle = transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
      : undefined

    return (
      <div
        ref={(el) => {
          if (ref) {
            if (typeof ref === "function") {
              ref(el)
            } else {
              ref.current = el
            }
          }
          eventRef.current = el
          if (!timeBased) {
            setDraggableNodeRef(el)
          }
        }}
        className={cn(
          "rounded-xl shadow-sm select-none z-10 group relative cursor-pointer",
          "hover:shadow-md transition-all duration-200",
          timeBased ? "absolute" : "relative",
          (isDragging || isDndKitDragging) && "opacity-75 shadow-lg",
        )}
        style={{
          backgroundColor: event.color || "#3b82f6",
          color: "white",
          ...style,
          ...dndKitStyle,
        }}
        onClick={handleClick}
        {...(!timeBased ? { ...attributes, ...listeners } : {})}
        {...props}
      >
        {timeBased && (
          <div
            className="absolute top-0 left-0 right-0 cursor-ns-resize opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-opacity z-20"
            style={{ height: "5%" }}
            onMouseDown={(e) => handleMouseDown(e, "start")}
            title="Drag to change start time"
          />
        )}

        <div
          className={cn("p-2", timeBased && "cursor-move")}
          style={{
            marginTop: "0",
            marginBottom: "0",
            height: timeBased ? "calc(90% - 0px)" : "auto",
            position: timeBased ? "absolute" : "relative",
            top: timeBased ? "5%" : "auto",
            left: timeBased ? "0" : "auto",
            right: timeBased ? "0" : "auto",
            bottom: timeBased ? "5%" : "auto",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            zIndex: 30,
          }}
          onMouseDown={timeBased ? (e) => handleMouseDown(e, "move") : undefined}
        >
          <div className="font-medium text-sm relative z-40">{event.title}</div>
          {timeBased && !isSmallEvent && (
            <div className="text-xs opacity-90 mt-1 relative z-40 truncate">
              {startTime} - {endTime}
            </div>
          )}
          {!timeBased && event.startUtc && (
            <div className="text-xs opacity-90 mt-1 relative z-40 truncate">{startTime}</div>
          )}
          {event.description && !isSmallEvent && (
            <div className="text-xs opacity-80 mt-1 truncate relative z-40">{event.description}</div>
          )}
        </div>

        {timeBased && (
          <div
            className="absolute bottom-0 left-0 right-0 cursor-ns-resize opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-opacity z-20"
            style={{ height: "5%" }}
            onMouseDown={(e) => handleMouseDown(e, "end")}
            title="Drag to change end time"
          />
        )}
      </div>
    )
  },
)

EventCard.displayName = "EventCard"
