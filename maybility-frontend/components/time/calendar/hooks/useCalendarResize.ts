import { useState, useEffect } from "react"
import { addMinutes } from "date-fns"
import type { Event } from "@/lib/types"

const HOUR_HEIGHT = 60

export function useCalendarResize(onUpdateEvent?: (event: Event) => void, isDragging?: boolean) {
  const [resizingEvent, setResizingEvent] = useState<{
    event: Event
    edge: "top" | "bottom"
    startY: number
    originalStart: Date
    originalEnd: Date
    currentStart: Date
    currentEnd: Date
  } | null>(null)

  const handleResizeStart = (e: React.MouseEvent, event: Event, edge: "top" | "bottom") => {
    // Don't start resize if drag is in progress
    if (isDragging) return
    e.stopPropagation()
    e.preventDefault()

    const startTime = new Date(event.startTime!)
    const endTime = event.endTime ? new Date(event.endTime) : addMinutes(startTime, 60)

    setResizingEvent({
      event,
      edge,
      startY: e.clientY,
      originalStart: startTime,
      originalEnd: endTime,
      currentStart: startTime,
      currentEnd: endTime,
    })
  }

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingEvent) return

    const deltaY = e.clientY - resizingEvent.startY
    const deltaMinutes = Math.round(((deltaY / HOUR_HEIGHT) * 60) / 5) * 5

    let newStart = resizingEvent.originalStart
    let newEnd = resizingEvent.originalEnd

    if (resizingEvent.edge === "top") {
      newStart = addMinutes(resizingEvent.originalStart, deltaMinutes)
      if (newStart >= newEnd) {
        newStart = addMinutes(newEnd, -5)
      }
    } else {
      newEnd = addMinutes(resizingEvent.originalEnd, deltaMinutes)
      if (newEnd <= newStart) {
        newEnd = addMinutes(newStart, 5)
      }
    }

    // Update local state only, don't trigger API call
    setResizingEvent({
      ...resizingEvent,
      currentStart: newStart,
      currentEnd: newEnd,
    })
  }

  const handleResizeEnd = () => {
    // Only call onUpdateEvent once when resize is complete
    if (resizingEvent && onUpdateEvent) {
      onUpdateEvent({
        ...resizingEvent.event,
        startTime: resizingEvent.currentStart.toISOString(),
        endTime: resizingEvent.currentEnd.toISOString(),
      })
    }
    setResizingEvent(null)
  }

  useEffect(() => {
    if (resizingEvent) {
      const onMouseMove = (e: MouseEvent) => handleResizeMove(e)
      const onMouseUp = () => handleResizeEnd()

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)

      return () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }
    }
  }, [resizingEvent, onUpdateEvent])

  return {
    resizingEvent,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
  }
}
