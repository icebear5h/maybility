import { useState } from "react"
import type { Event, Task } from "@/lib/types"

export function useCalendarDrag(
  onUpdateEvent?: (event: Event) => void,
  onTaskDrop?: (task: Task, date: Date) => void,
  isResizing?: boolean,
) {
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [draggingEvent, setDraggingEvent] = useState<Event | null>(null)

  const handleEventDragStart = (e: React.DragEvent, event: Event) => {
    // Don't start drag if resize is in progress
    if (isResizing) {
      e.preventDefault()
      return
    }
    e.stopPropagation()
    setDraggingEvent(event)
    e.dataTransfer.setData("application/event", JSON.stringify(event))
    e.dataTransfer.effectAllowed = "move"
  }

  const handleEventDragEnd = () => {
    setDraggingEvent(null)
  }

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDropTarget(targetId)
  }

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    setDropTarget(null)

    // date already has the correct time (with 5-minute snapping applied by the caller)
    const targetDate = new Date(date)

    try {
      const eventData = e.dataTransfer.getData("application/event")
      if (eventData && onUpdateEvent) {
        const event = JSON.parse(eventData) as Event
        const originalStart = new Date(event.startTime!)
        const originalEnd = event.endTime ? new Date(event.endTime) : null

        // Calculate new end time to maintain duration
        let newEndTime: string | null = null
        if (originalEnd) {
          const duration = originalEnd.getTime() - originalStart.getTime()
          const newEnd = new Date(targetDate.getTime() + duration)
          newEndTime = newEnd.toISOString()
        }

        onUpdateEvent({
          ...event,
          startTime: targetDate.toISOString(),
          ...(newEndTime && { endTime: newEndTime })
        })
        setDraggingEvent(null)
        return
      }
    } catch (err) {}

    try {
      const taskData = e.dataTransfer.getData("application/json")
      if (taskData && onTaskDrop) {
        const task = JSON.parse(taskData) as Task
        onTaskDrop(task, targetDate)
      }
    } catch (err) {
      console.error("Failed to parse dropped data:", err)
    }
  }

  return {
    dropTarget,
    draggingEvent,
    handleEventDragStart,
    handleEventDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  }
}
