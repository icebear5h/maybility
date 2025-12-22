"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import type { Event } from "@/lib/types"

interface ResizeState {
  eventId: string
  edge: "left" | "right"
  startX: number
  originalStart: Date
  originalEnd: Date
  currentStart?: Date
  currentEnd?: Date
}

export function useTimelineResize(
  events: Event[],
  onUpdateEvent?: (event: Event) => void,
  hourWidth: number = 120,
) {
  const [resizing, setResizing] = useState<ResizeState | null>(null)

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, eventId: string, edge: "left" | "right", event: Event) => {
      e.stopPropagation()
      e.preventDefault()

      const start = event.startTime ? new Date(event.startTime) : new Date()
      const end = event.endTime
        ? new Date(event.endTime)
        : new Date(start.getTime() + 3600000)

      setResizing({
        eventId,
        edge,
        startX: e.clientX,
        originalStart: start,
        originalEnd: end,
      })
    },
    [],
  )

  useEffect(() => {
    if (!resizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizing.startX
      const deltaMs = (deltaX / hourWidth) * 3600000

      if (resizing.edge === "left") {
        const newStart = new Date(resizing.originalStart.getTime() + deltaMs)
        // Snap to 15 min
        newStart.setMinutes(Math.round(newStart.getMinutes() / 15) * 15, 0, 0)
        // Don't let start go past end
        if (newStart.getTime() < resizing.originalEnd.getTime() - 900000) {
          setResizing(prev => prev ? { ...prev, currentStart: newStart } : null)
        }
      } else {
        const newEnd = new Date(resizing.originalEnd.getTime() + deltaMs)
        newEnd.setMinutes(Math.round(newEnd.getMinutes() / 15) * 15, 0, 0)
        // Don't let end go before start
        if (newEnd.getTime() > resizing.originalStart.getTime() + 900000) {
          setResizing(prev => prev ? { ...prev, currentEnd: newEnd } : null)
        }
      }
    }

    const handleMouseUp = () => {
      if (!resizing || !onUpdateEvent) {
        setResizing(null)
        return
      }

      const event = events.find(e => e.id === resizing.eventId)
      if (event) {
        const newStart = resizing.currentStart || resizing.originalStart
        const newEnd = resizing.currentEnd || resizing.originalEnd

        onUpdateEvent({
          ...event,
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
        })
      }

      setResizing(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [resizing, events, onUpdateEvent, hourWidth])

  return { resizing, handleResizeStart }
}
