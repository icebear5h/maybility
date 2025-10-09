"use client"

import { useState, useRef, useEffect } from "react"
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent } from "@dnd-kit/core"
import { TaskSidebar } from "@/components/calendar/task-sidebar"
import { WeekAndDayView } from "@/components/calendar/day-based/week-and-day-view"
import { MonthView } from "@/components/calendar/months/month-view"
import { CalendarNavigation } from "@/components/calendar/calendar-navigation"
import { EventModal } from "@/components/calendar/events/event-modal"
import { useCalendarState } from "@/hooks/use-calendar-state"
import type { Occurrence } from "@/types/calendar-types"
import type { Task } from "@/types/task-types"

const CalendarView = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const containerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Use custom hooks for state management
  const calendarState = useCalendarState({
    initialEvents: [] as Occurrence[],
    initialDate: new Date(),
  })

  const handleAddTask = async (title: string) => {
    try {
      setLoading(true)

      // Create the task via API first
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description: "",
          status: "TODO",
          priority: "MEDIUM",
          color: "#3b82f6",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create task")
      }

      const newTask = await response.json()

      // Only update the UI after successful API response
      setTasks((prev) => [...prev, newTask])

      // If the task has a scheduled date, also create an event
      if (newTask.dtstart) {
        const newEvent: Occurrence = {
          id: `temp-${Date.now()}`,
          taskId: newTask.id,
          title: newTask.title,
          description: newTask.description,
          date: new Date(newTask.dtstart),
          startTime: newTask.startTime || "09:00",
          endTime: newTask.endTime || "10:00",
          color: newTask.color || "#3b82f6",
          status: (newTask.status as "TODO" | "IN_PROGRESS" | "DONE") || "TODO",
          goalId: newTask.goalId || "",
          occurrenceType: "SINGLE",
          hasOverride: false,
        }
        calendarState.setEvents((prev) => [...prev, newEvent])
      }
    } catch (error) {
      console.error("Failed to create task:", error)
      setError("Failed to create task. Please try again.")
    } finally {
      setLoading(false)
    }
  }
  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error("Failed to update task")
      }

      const updatedTask = await response.json()
      setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)))
    } catch (error) {
      console.error("Failed to update task:", error)
      setError("Failed to update task. Please try again.")
    }
  }

  const handleDeleteTask = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete task")
      }

      setTasks((prev) => prev.filter((task) => task.id !== id))
    } catch (error) {
      console.error("Failed to delete task:", error)
      setError("Failed to delete task. Please try again.")
    }
  }

  // Fetch initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true)
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

        await calendarState.handleGetEvents(startOfMonth, endOfMonth)

        setError(null)
      } catch (error) {
        console.error("Failed to load initial data:", error)
        setError("Failed to load calendar data. Please refresh the page to try again.")
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  const handleTimeSlotClick = (date: string, time: string) => {
    calendarState.setSelectedDate(date)
    calendarState.setNewEventStartTime(time)
    // Set end time to 1 hour later
    const [hours, minutes] = time.split(":").map(Number)
    const endHour = hours + 1
    const endTime = `${endHour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
    calendarState.setNewEventEndTime(endTime)
    calendarState.setShowEventModal(true)
  }

  const handleEventClick = (event: Occurrence) => {
    calendarState.setSelectedEvent(event)
    const eventDate = event.date instanceof Date ? event.date : new Date(event.date)
    calendarState.setSelectedDate(eventDate.toISOString().split("T")[0])
    calendarState.setShowEventModal(true)
  }

  const snapToFiveMinutes = (minutes: number): number => {
    return Math.round(minutes / 5) * 5
  }

  const handleEventDrag = async (
    event: Occurrence,
    dragType: "start" | "end" | "move",
    deltaMinutes: number,
    newDate?: string,
    isComplete = true,
  ) => {
    try {
      // Parse current times from event
      const [startHours, startMins] = event.startTime.split(":").map(Number)
      const [endHours, endMins] = event.endTime.split(":").map(Number)
      const startMinutes = startHours * 60 + startMins
      const endMinutes = endHours * 60 + endMins
      const duration = endMinutes - startMinutes

      let newStartTimeStr: string
      let newEndTimeStr: string
      let newScheduledDate: string
      const eventDate = event.date instanceof Date ? event.date : new Date(event.date)

      if (dragType === "start") {
        // Only change start time
        const newStartMinutes = snapToFiveMinutes(Math.max(0, Math.min(1439, startMinutes + deltaMinutes)))
        const newStartHours = Math.floor(newStartMinutes / 60)
        const newStartMins = newStartMinutes % 60
        newStartTimeStr = `${newStartHours.toString().padStart(2, "0")}:${newStartMins.toString().padStart(2, "0")}`
        newEndTimeStr = event.endTime
        newScheduledDate = eventDate.toISOString().split("T")[0]
      } else if (dragType === "end") {
        // Only change end time
        const newEndMinutes = snapToFiveMinutes(Math.max(0, Math.min(1439, endMinutes + deltaMinutes)))
        const newEndHours = Math.floor(newEndMinutes / 60)
        const newEndMins = newEndMinutes % 60
        newStartTimeStr = event.startTime
        newEndTimeStr = `${newEndHours.toString().padStart(2, "0")}:${newEndMins.toString().padStart(2, "0")}`
        newScheduledDate = eventDate.toISOString().split("T")[0]
      } else {
        // Move entire event
        if (newDate) {
          // Moving to a different date
          const newStartMinutes = snapToFiveMinutes(Math.max(0, Math.min(1439, startMinutes + deltaMinutes)))
          const newStartHours = Math.floor(newStartMinutes / 60)
          const newStartMins = newStartMinutes % 60
          newStartTimeStr = `${newStartHours.toString().padStart(2, "0")}:${newStartMins.toString().padStart(2, "0")}`
          
          const newEndMinutes = newStartMinutes + duration
          const newEndHours = Math.floor(newEndMinutes / 60)
          const newEndMins = newEndMinutes % 60
          newEndTimeStr = `${newEndHours.toString().padStart(2, "0")}:${newEndMins.toString().padStart(2, "0")}`
          newScheduledDate = newDate
        } else {
          // Moving within the same day
          const newStartMinutes = snapToFiveMinutes(Math.max(0, Math.min(1439, startMinutes + deltaMinutes)))
          const newStartHours = Math.floor(newStartMinutes / 60)
          const newStartMins = newStartMinutes % 60
          newStartTimeStr = `${newStartHours.toString().padStart(2, "0")}:${newStartMins.toString().padStart(2, "0")}`
          
          const newEndMinutes = newStartMinutes + duration
          const newEndHours = Math.floor(newEndMinutes / 60)
          const newEndMins = newEndMinutes % 60
          newEndTimeStr = `${newEndHours.toString().padStart(2, "0")}:${newEndMins.toString().padStart(2, "0")}`
          newScheduledDate = eventDate.toISOString().split("T")[0]
        }
      }

      if (isComplete) {
        console.log("[v0] Drag completed - making API call with final values")

        // Update the event via API using taskId
        const updates = {
          scheduledDate: newScheduledDate,
          startTime: newStartTimeStr,
          endTime: newEndTimeStr,
        }

        console.log("[v0] Updated event via API:", event.taskId || event.id, updates)
        await calendarState.handleUpdateEvent(event.taskId || event.id, updates)
      }

      // Update the local event state immediately for smooth UX
      calendarState.setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id
            ? {
                ...e,
                date: new Date(newScheduledDate),
                startTime: newStartTimeStr,
                endTime: newEndTimeStr,
              }
            : e,
        ),
      )
    } catch (error) {
      console.error("Failed to update event:", error)
      alert("Failed to update event. Please try again.")
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    console.log("[v0] Drag started:", active.data.current)
    if (active.data.current?.type === "task") {
      setDraggedTask(active.data.current.task)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    console.log("[v0] Drag ended - processing drop")

    // Reset the dragged task
    setDraggedTask(null)

    if (!over) {
      console.log("[v0] No drop target, canceling")
      return
    }

    // Handle task drop from sidebar
    if (active.id.toString().startsWith("task-") && over.id) {
      try {
        const taskId = active.id.toString().replace("task-", "")
        const targetDate = over.id.toString()

        // Find the task being dragged
        const task = tasks.find((t) => t.id === taskId)
        if (!task) return

        // Update the task with the new scheduled date
        await handleUpdateTask(taskId, {
          startDate: new Date(targetDate),
          // Preserve the existing time or set a default
          startTime: task.startTime || "09:00",
          endTime: task.endTime || "10:00",
        })

        console.log(`Moved task ${taskId} to ${targetDate}`)
      } catch (error) {
        console.error("Error handling task drop:", error)
      }
    }

    // Handle event drop (dragging events between dates)
    if (active.data.current?.type === "event" && over.id) {
      const draggedEvent = active.data.current.event as Occurrence
      const sourceDate = active.data.current.sourceDate as string
      const targetDate = over.id.toString()

      console.log("[v0] Event drag detected:", {
        eventTitle: draggedEvent.title,
        sourceDate,
        targetDate,
        eventId: draggedEvent.id,
        taskId: draggedEvent.taskId,
      })

      if (sourceDate !== targetDate) {
        // Preserve the original time, only change the date
        const startTime = draggedEvent.startTime
        const endTime = draggedEvent.endTime

        // OPTIMISTIC UPDATE: Update UI immediately for smooth UX
        const originalEvent = { ...draggedEvent }
        calendarState.setEvents((prev) =>
          prev.map((e) =>
            e.id === draggedEvent.id
              ? {
                  ...e,
                  date: new Date(targetDate),
                  startTime: startTime,
                  endTime: endTime,
                }
              : e,
          ),
        )

        // Make API call in background
        const updates = {
          scheduledDate: targetDate,
          startTime: startTime,
          endTime: endTime,
        }

        console.log("[v0] Updating event via API (optimistic):", draggedEvent.taskId || draggedEvent.id, updates)

        // API call happens asynchronously - don't await it
        calendarState.handleUpdateEvent(draggedEvent.taskId || draggedEvent.id, updates).catch((error) => {
          console.error("Failed to move event, reverting:", error)

          // REVERT: If API call fails, revert the optimistic update
          calendarState.setEvents((prev) =>
            prev.map((e) =>
              e.id === draggedEvent.id
                ? originalEvent // Restore original event
                : e,
            ),
          )

          // Show user-friendly error
          alert("Failed to move event. The change has been reverted.")
        })
      }
    }
  }

  const renderCalendarView = () => {
    const commonProps = {
      currentDate: calendarState.currentDate,
      events: calendarState.events,
      containerRefs,
      onTimeSlotClick: handleTimeSlotClick,
      onEventClick: handleEventClick,
    }

    switch (calendarState.view) {
      case "month":
        return <MonthView {...commonProps} />
      case "week":
        return (
          <WeekAndDayView {...commonProps} onEventDrag={handleEventDrag} view={calendarState.view as "week" | "day"} />
        )
      case "day":
        return (
          <WeekAndDayView {...commonProps} onEventDrag={handleEventDrag} view={calendarState.view as "week" | "day"} />
        )
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)] bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)] bg-white">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-5 h-[calc(100vh-120px)]">
        {/* Task Sidebar */}
        <TaskSidebar
          tasks={tasks}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onUpdateTask={handleUpdateTask}
          onToggleTask={(id: string) => {
            const task = tasks.find((t) => t.id === id)
            if (task) {
              handleUpdateTask(id, { status: task.status === "DONE" ? "TODO" : "DONE" })
            }
          }}
        />

        {/* Calendar */}
        <div className="flex-1 flex flex-col">
          {/* Navigation */}
          <CalendarNavigation
            dateRangeText={calendarState.getDateRangeText()}
            onPrevPeriod={calendarState.handlePrevPeriod}
            onNextPeriod={calendarState.handleNextPeriod}
            onToday={calendarState.handleToday}
            view={calendarState.view}
            onViewChange={calendarState.setView}
          />

          {/* Calendar View */}
          <div className="flex-1 bg-white">{renderCalendarView()}</div>
        </div>

        {/* Event Modal */}
        {calendarState.showEventModal && (
          <EventModal
            isOpen={calendarState.showEventModal}
            onClose={() => {
              calendarState.setShowEventModal(false)
              calendarState.setSelectedEvent(null)
            }}
            selectedDate={calendarState.selectedDate}
            newEventTitle={calendarState.newEventTitle}
            setNewEventTitle={calendarState.setNewEventTitle}
            newEventStartTime={calendarState.newEventStartTime}
            setNewEventStartTime={calendarState.setNewEventStartTime}
            newEventEndTime={calendarState.newEventEndTime}
            setNewEventEndTime={calendarState.setNewEventEndTime}
            onCreateEvent={calendarState.handleCreateEvent}
            event={calendarState.selectedEvent}
            onUpdate={async (eventId: string, updates: Partial<Occurrence>) => {
              await calendarState.handleUpdateEvent(eventId, updates)
              calendarState.setSelectedEvent(null)
            }}
            onDelete={async (eventId: string) => {
              await calendarState.handleDeleteEvent(eventId)
              calendarState.setSelectedEvent(null)
            }}
          />
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {draggedTask ? (
          <div className="p-3 border border-stone-200 rounded-lg bg-white shadow-lg opacity-90 max-w-64">
            <div className="text-sm font-medium text-stone-800">{draggedTask.title}</div>
            <div className="text-xs text-stone-500 mt-1">Drop on calendar to schedule</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default CalendarView
