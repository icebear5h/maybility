import { useState, useEffect, useCallback } from "react"
import type { DragEndEvent } from "@dnd-kit/core"
import type { Occurrence, DragState } from "@/types/calendar-types"
import type { Task } from "@/types/task-types"

// Helper functions
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

const getDateFromUtc = (utc: string): string => {
  return new Date(utc).toISOString().split('T')[0]
}

const getTimeFromUtc = (utc: string): string => {
  return new Date(utc).toTimeString().slice(0, 5)
}

interface UseCalendarDragProps {
  events: Occurrence[]
  setEvents: React.Dispatch<React.SetStateAction<Occurrence[]>>
  containerRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>
  onUpdateTodo: (id: string, updates: Partial<Task>) => void
  currentView?: "day" | "week" | "month"
}

export function useCalendarDrag({ 
  events, 
  setEvents, 
  containerRefs, 
  onUpdateTodo,
  currentView = "month"
}: UseCalendarDragProps) {
  const [dragState, setDragState] = useState<DragState>({
    eventId: null,
    type: null,
    startY: 0,
    startX: 0,
    containerHeight: 0,
    originalStartUtc: "",
    originalEndUtc: "",
    originalDate: "",
  })

  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [activeDragItem, setActiveDragItem] = useState<any>(null)
  const [hasDragged, setHasDragged] = useState(false)

  const handleDragStart = useCallback((event: any) => {
    setActiveDragItem(event.active.data.current)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragItem(null)

    if (!over) return

    // Handle todo being dropped on calendar
    if (active.data.current?.type === "todo" && over.id) {
      const todo = active.data.current.todo as Task
      const targetDate = over.id as string

      // Check if this todo already has an event on this date
      const existingEvent = events.find((event) => 
        event.taskId === todo.id && getDateFromUtc(event.startUtc) === targetDate
      )
      if (existingEvent) return

      // Calculate precise time from drop position if available
      let startTime = "09:00"
      let endTime = "10:00"

      const dropElement = document.querySelector(`[data-date="${targetDate}"]`)
      if (dropElement) {
        const dropY = dropElement.getAttribute("data-drop-y")
        const containerHeight = dropElement.getAttribute("data-container-height")

        if (dropY && containerHeight) {
          const totalMinutes = 24 * 60
          const clickedMinutes = Math.floor(
            (Number.parseFloat(dropY) / Number.parseFloat(containerHeight)) * totalMinutes,
          )
          const snappedMinutes = Math.round(clickedMinutes / 5) * 5
          const hours = Math.floor(snappedMinutes / 60)
          const mins = snappedMinutes % 60
          startTime = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`

          const defaultDuration = todo.estimatedDuration ? todo.estimatedDuration : 60
          const endMinutes = Math.min(24 * 60, snappedMinutes + defaultDuration)
          const endHours = Math.floor(endMinutes / 60)
          const endMins = endMinutes % 60
          endTime = `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`

          dropElement.removeAttribute("data-drop-y")
          dropElement.removeAttribute("data-container-height")
        }
      }

      const newEvent: Occurrence = {
        id: `event-${Date.now()}`,
        taskId: todo.id,
        title: todo.title,
        description: todo.description || "",
        startUtc: new Date(`${targetDate}T${startTime}:00`).toISOString(),
        endUtc: new Date(`${targetDate}T${endTime}:00`).toISOString(),
        color: todo.color || "#10b981",
        status: todo.status,
        source: "SINGLE",
        isRecurring: false,
        hasOverride: false
      }

      setEvents((prev) => [...prev, newEvent])
      onUpdateTodo(todo.id, { scheduledDate: new Date(targetDate) })
    }
  }, [events, setEvents, onUpdateTodo])

  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    eventId: string,
    type: "move" | "resize-start" | "resize-end",   
    date: string,
  ) => {
    e.preventDefault()
    const event = events.find((ev) => ev.id === eventId)
    if (!event) return

    setHasDragged(false)
    setDragState({
      eventId,
      type,
      startY: e.clientY,
      startX: e.clientX,
      containerHeight: 0,
      originalStartUtc: event.startUtc,
      originalEndUtc: event.endUtc,
      originalDate: date,
    })
  }, [events])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.eventId || !dragState.originalEndUtc) return

    const deltaY = e.clientY - dragState.startY
    const container = containerRefs.current[dragState.originalDate]
    if (!container) return

    if (Math.abs(deltaY) > 3) {
      setHasDragged(true)
    }

    // Skip time calculations for month view - only allow day-to-day movement
    if (currentView === "month") {
      if (dragState.type === "move") {
        const elementsUnderMouse = document.elementsFromPoint(e.clientX, e.clientY)
        const dayElement = elementsUnderMouse.find((el) => {
          const dataDate = el.getAttribute("data-date")
          return dataDate && dataDate !== dragState.originalDate
        })

        if (dayElement) {
          const newDate = dayElement.getAttribute("data-date")
          setDragOverDate(newDate)
        } else {
          setDragOverDate(null)
        }
      }
      return // Exit early for month view - no time changes
    }

    // Time-based calculations for day/week views only
    const containerHeight = container.getBoundingClientRect().height
    const minutesPerPixel = (24 * 60) / containerHeight
    const deltaMinutes = Math.round((deltaY * minutesPerPixel) / 5) * 5

    const originalStartMinutes = timeToMinutes(getTimeFromUtc(dragState.originalStartUtc))
    const originalEndMinutes = timeToMinutes(getTimeFromUtc(dragState.originalEndUtc))

    let newStartTime = getTimeFromUtc(dragState.originalStartUtc)
    let newEndTime = getTimeFromUtc(dragState.originalEndUtc)

    if (dragState.type === "move") {
      const newStartMinutes = Math.max(0, Math.min(23 * 60 + 55, originalStartMinutes + deltaMinutes))
      const duration = originalEndMinutes - originalStartMinutes
      const newEndMinutes = Math.min(24 * 60, newStartMinutes + duration)

      newStartTime = minutesToTime(newStartMinutes)
      newEndTime = minutesToTime(newEndMinutes)
    } else if (dragState.type === "resize-start") {
      const newStartMinutes = Math.max(0, Math.min(originalEndMinutes - 5, originalStartMinutes + deltaMinutes))
      newStartTime = minutesToTime(newStartMinutes)
    } else if (dragState.type === "resize-end") {
      const newEndMinutes = Math.max(originalStartMinutes + 5, Math.min(24 * 60, originalEndMinutes + deltaMinutes))
      newEndTime = minutesToTime(newEndMinutes)
    }

    setEvents((prev) =>
      prev.map((event) =>
        event.id === dragState.eventId ? { 
          ...event, 
          startUtc: new Date(`${dragState.originalDate}T${newStartTime}:00`).toISOString(),
          endUtc: new Date(`${dragState.originalDate}T${newEndTime}:00`).toISOString()
        } : event,
      ),
    )

    if (dragState.type === "move") {
      const elementsUnderMouse = document.elementsFromPoint(e.clientX, e.clientY)
      const dayElement = elementsUnderMouse.find((el) => {
        const dataDate = el.getAttribute("data-date")
        return dataDate && dataDate !== dragState.originalDate
      })

      if (dayElement) {
        const newDate = dayElement.getAttribute("data-date")
        setDragOverDate(newDate)
      } else {
        setDragOverDate(null)
      }
    }
  }, [dragState, containerRefs, setEvents, currentView])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!dragState.eventId) return

    if (dragState.type === "move") {
      const elementsUnderMouse = document.elementsFromPoint(e.clientX, e.clientY)
      const dayElement = elementsUnderMouse.find((el) => {
        const dataDate = el.getAttribute("data-date")
        return dataDate && dataDate !== dragState.originalDate
      })

      if (dayElement) {
        const newDate = dayElement.getAttribute("data-date")
        if (newDate && newDate !== dragState.originalDate) {
          setEvents((prev) =>
            prev.map((event) => (event.id === dragState.eventId ? { 
              ...event, 
              startUtc: new Date(`${newDate}T${getTimeFromUtc(event.startUtc)}:00`).toISOString(),
              endUtc: new Date(`${newDate}T${getTimeFromUtc(event.endUtc)}:00`).toISOString()
            } : event)),
          )
        }
      } else if (dragOverDate && dragOverDate !== dragState.originalDate) {
        setEvents((prev) =>
          prev.map((event) => (event.id === dragState.eventId ? { 
            ...event, 
            startUtc: new Date(`${dragOverDate}T${getTimeFromUtc(event.startUtc)}:00`).toISOString(),
            endUtc: new Date(`${dragOverDate}T${getTimeFromUtc(event.endUtc)}:00`).toISOString()
          } : event)),
        )
      }
    }

    setDragState({
      eventId: null,
      type: null,
      startY: 0,
      startX: 0,
      containerHeight: 0,
      originalStartUtc: "",
      originalEndUtc: "",
      originalDate: "",
    })
    setDragOverDate(null)
    
    setTimeout(() => {
      setHasDragged(false)
    }, 100)
  }, [dragState, dragOverDate, setEvents])

  useEffect(() => {
    if (dragState.eventId) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = dragState.type === "move" ? "grabbing" : "ns-resize"
      document.body.style.userSelect = "none"

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
      }
    }
  }, [dragState.eventId, handleMouseMove, handleMouseUp])

  return {
    dragState,
    dragOverDate,
    activeDragItem,
    hasDragged,
    handleDragStart,
    handleDragEnd,
    handleMouseDown,
  }
}
