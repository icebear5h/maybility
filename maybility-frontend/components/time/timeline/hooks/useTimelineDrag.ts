"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import type { Event } from "@/lib/types"

interface DragState {
  eventId: string
  startX: number
  originalStart: Date
  originalEnd: Date
  currentStart?: Date
  currentEnd?: Date
}

export function useTimelineDrag(
  events: Event[],
  onUpdateEvent?: (event: Event) => void,
  hourWidth: number = 120,
  isResizing: boolean = false,
) {
  const [draggingEvent, setDraggingEvent] = useState<DragState | null>(null)

  const handleEntryDragStart = useCallback(
    (e: React.MouseEvent, event: Event) => {
      if (isResizing) return
      e.stopPropagation()
      e.preventDefault()

      const start = event.startTime ? new Date(event.startTime) : new Date()
      const end = event.endTime
        ? new Date(event.endTime)
        : new Date(start.getTime() + 3600000)

      setDraggingEvent({
        eventId: event.id,
        startX: e.clientX,
        originalStart: start,
        originalEnd: end,
      })
    },
    [isResizing],
  )

  useEffect(() => {
    if (!draggingEvent) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - draggingEvent.startX
      const deltaMs = (deltaX / hourWidth) * 3600000

      const newStart = new Date(draggingEvent.originalStart.getTime() + deltaMs)
      const newEnd = new Date(draggingEvent.originalEnd.getTime() + deltaMs)

      // Snap to 15 min
      newStart.setMinutes(Math.round(newStart.getMinutes() / 15) * 15, 0, 0)
      newEnd.setMinutes(Math.round(newEnd.getMinutes() / 15) * 15, 0, 0)

      setDraggingEvent(prev => prev ? {
        ...prev,
        currentStart: newStart,
        currentEnd: newEnd,
      } : null)
    }

    const handleMouseUp = () => {
      if (!draggingEvent || !onUpdateEvent) {
        setDraggingEvent(null)
        return
      }

      const event = events.find(ev => ev.id === draggingEvent.eventId)
      if (event && draggingEvent.currentStart && draggingEvent.currentEnd) {
        onUpdateEvent({
          ...event,
          startTime: draggingEvent.currentStart.toISOString(),
          endTime: draggingEvent.currentEnd.toISOString(),
        })
      }

      setDraggingEvent(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [draggingEvent, events, onUpdateEvent, hourWidth])

  return { draggingEvent, handleEntryDragStart }
}
