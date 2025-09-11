"use client"

import { useState, useRef, useEffect } from "react"
import { DndContext, DragOverlay, useDndMonitor } from "@dnd-kit/core"
import { TaskSidebar } from "@/components/calendar/task-sidebar"
import { WeekAndDayView } from "@/components/calendar/day-based/week-and-day-view"
import { MonthView } from "@/components/calendar/months/month-view"
import { CalendarNavigation } from "@/components/calendar/calendar-navigation"
import { EventModal } from "@/components/calendar/events/event-modal"
import { EventCard } from "@/components/calendar/events/event-card"
import { useCalendarState } from "@//hooks/use-calendar-state"
import { useCalendarDrag } from "@//hooks/use-calendar-drag"
import { expandRecurringEventsForView } from "@//lib/recurring-events"
import type { Task } from "@//types/task-types"
import type { Occurrence } from "@//types/calendar-types"

export default function CalendarView() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Use custom hooks for state management
  const calendarState = useCalendarState({
    initialEvents: [],
    initialDate: new Date()
  })

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Fetch tasks for sidebar
        const tasksRes = await fetch('/api/tasks', { method: 'GET' })
        if (!tasksRes.ok) throw new Error(`Failed to fetch tasks: ${tasksRes.status}`)
        const tasksData = await tasksRes.json()
        setTasks(tasksData || [])
        
        // Generate events from tasks (including RRULE expansion)
        const allEvents = generateEventsFromTasks(tasksData || [], calendarState.currentDate, calendarState.view)
        calendarState.setEvents(allEvents)
      } catch (e: any) {
        console.error('Failed to fetch calendar data:', e)
        setError(e?.message || 'Failed to load calendar data')
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  // Regenerate occurrences whenever inputs change
  useEffect(() => {
    const allEvents = generateEventsFromTasks(tasks, calendarState.currentDate, calendarState.view)
    calendarState.setEvents(allEvents)
  }, [tasks, calendarState.currentDate, calendarState.view])

  // Build render-time occurrences from tasks
  const generateEventsFromTasks = (tasks: Task[], currentDate: Date, view: string): Occurrence[] => {
    const all: Occurrence[] = []

    // Singles (scheduledDate without rrule)
    for (const t of tasks) {
      if (t.scheduledDate && !t.rrule) {
        const d = new Date(t.scheduledDate)
        const start = new Date(d)
        const end = new Date(d)

        if (t.startTime) {
          const [hh, mm] = t.startTime.split(":").map(Number)
          start.setHours(hh, mm, 0, 0)
        } else {
          start.setHours(9, 0, 0, 0) // default 9am
        }

        if (t.endTime) {
          const [hh, mm] = t.endTime.split(":").map(Number)
          end.setHours(hh, mm, 0, 0)
        } else if (t.estimatedDuration) {
          end.setTime(start.getTime() + t.estimatedDuration * 60 * 1000)
        } else {
          end.setTime(start.getTime() + 60 * 60 * 1000) // default 1h
        }

        all.push({
          id: `${t.id}:${t.scheduledDate}`,
          taskId: t.id,
          title: t.title,
          description: t.description || "",
          startUtc: start.toISOString(),
          endUtc: end.toISOString(),
          color: t.color || "#3b82f6",
          status: t.status,
          source: "SINGLE",
          isRecurring: false,
          hasOverride: false,
        })
      }
    }

    // RRULE expansion
    const recur = expandRecurringEventsForView(tasks, currentDate, view as any)
    all.push(...recur)

    return all.sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime())
  }

  // Task management functions
  const handleAddTask = async (title: string) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Treat input as description-only unscheduled task; mirror into title so it displays in the list
          title,
          description: title,
          status: 'TODO',
          priority: 'MEDIUM',
          dueDate: null,
          scheduledDate: null,
          startTime: null,
          endTime: null,
          estimatedDuration: null,
          color: '#3b82f6',
          rrule: null,
          dtstart: null,
          timezone: 'America/Los_Angeles'
        })
      })

      if (!res.ok) throw new Error('Failed to create task')
      const newTask: Task = await res.json()
      setTasks((prev) => [...prev, newTask])
    } catch (e) {
      console.error('Failed to create task:', e)
      alert('Failed to create task. Please try again.')
    }
  }

  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    
    try {
      const newStatus = task.status === "DONE" ? "TODO" : "DONE"
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
        })
      })

      if (!res.ok) {
        throw new Error(`Failed to update task: ${res.status}`)
      }

      const updatedTask = await res.json()
      setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)))
    } catch (err: any) {
      console.error('Error toggling task:', err)
      setError(err.message || 'Failed to update task')
    }
  }

  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete task')
      
      setTasks((prev) => prev.filter((task) => task.id !== id))
      calendarState.setEvents((prev) => prev.filter((event) => event.taskId !== id))
    } catch (e) {
      console.error('Failed to delete task:', e)
      alert('Failed to delete task. Please try again.')
    }
  }

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!res.ok) {
        throw new Error(`Failed to update task: ${res.status}`)
      }

      const updatedTask = await res.json()
      setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)))
    } catch (err: any) {
      console.error('Error updating task:', err)
      setError(err.message || 'Failed to update task')
    }
  }

  // Create task with schedule (unified create operation)
  const handleCreateTask = async (eventData: {
    title: string
    description: string
    startTime: string
    endTime: string
    date: string
  }) => {
    try {
      // Validate date format
      const eventDate = new Date(eventData.date)
      if (isNaN(eventDate.getTime())) {
        throw new Error('Invalid date provided')
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(eventData.startTime) || !timeRegex.test(eventData.endTime)) {
        throw new Error('Invalid time format. Use HH:MM format.')
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: eventData.title,
          description: eventData.description,
          scheduledDate: eventData.date,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          status: 'TODO',
          priority: 'MEDIUM',
          color: '#3b82f6',
          dueDate: null,
          estimatedDuration: null,
          rrule: null,
          dtstart: null,
          timezone: null
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.status}`)
      }

      const newTask = await response.json()
      
      // Add to tasks
      setTasks((prev) => [...prev, newTask])
      
      // Add to events
      const startDate = new Date(`${eventData.date}T${eventData.startTime}:00`)
      const endDate = new Date(`${eventData.date}T${eventData.endTime}:00`)
      const newEvent: Occurrence = {
        id: `${newTask.id}:${newTask.scheduledDate}`,
        taskId: newTask.id,
        title: newTask.title,
        description: eventData.description,
        startUtc: startDate.toISOString(),
        endUtc: endDate.toISOString(),
        color: newTask.color, 
        status: newTask.status,
        source: "SINGLE" as const,
        isRecurring: false,
        hasOverride: false
      }
      calendarState.setEvents((prev) => [...prev, newEvent])
      calendarState.setShowEventModal(false)
    } catch (err: any) {
      console.error('Error creating task:', err)
      setError(err.message || 'Failed to create task')
    }
  }


  // Use drag hook
  const dragHandlers = useCalendarDrag({
    events: calendarState.events,
    setEvents: calendarState.setEvents,
    containerRefs,
    onUpdateTask: handleUpdateTask,
    currentView: calendarState.view
  })

  // Enhanced event click handler that respects drag state
  const handleEventClick = (event: Occurrence) => {
    if (dragHandlers.dragState.eventId) {
      return
    }
    calendarState.handleEventClick(event)
  }

  // Render the appropriate calendar view
  const renderCalendarView = () => {
    const commonProps = {
      currentDate: calendarState.currentDate,
      events: calendarState.events,
      dragState: dragHandlers.dragState,
      onEventClick: handleEventClick,
      containerRefs,
    }

    switch (calendarState.view) {
      case "month":
        return <MonthView {...commonProps} onTimeSlotClick={calendarState.handleTimeSlotClick} />
      case "week":
        return <WeekAndDayView {...commonProps} view={calendarState.view as "week" | "day"} onTimeSlotClick={calendarState.handleTimeSlotClick} />
      case "day":
        return <WeekAndDayView {...commonProps} view={calendarState.view as "week" | "day"} onTimeSlotClick={calendarState.handleTimeSlotClick} />
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
    <DndContext
      onDragStart={dragHandlers.onDragStart}
      onDragMove={dragHandlers.onDragMove}
      onDragEnd={dragHandlers.onDragEnd}
    >
      <div className="flex gap-5 h-[calc(100vh-120px)]">
        {/* Task Sidebar */}
        <TaskSidebar
          tasks={tasks}
          onAddTask={handleAddTask}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
          onUpdateTask={handleUpdateTask}
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
          <div className="flex-1 bg-white">
            {renderCalendarView()}
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {dragHandlers.dragState.eventId ? (
          dragHandlers.dragState.entity === "task" ? (
            <div className="bg-white rounded shadow-lg border px-3 py-2 max-w-xs">
              {tasks.find(t => t.id === dragHandlers.dragState.eventId)?.title ?? "Dragging…"}
            </div>
          ) : (
            (() => {
              const ev = calendarState.events.find(e => e.id === dragHandlers.dragState.eventId);
              return ev ? <EventCard event={ev} /> : null;
            })()
          )
        ) : null}
      </DragOverlay>

      {/* Modals */}
      <EventModal
        isOpen={calendarState.showEventModal}
        onClose={() => calendarState.setShowEventModal(false)}
        selectedDate={calendarState.selectedDate}
        selectedTime={calendarState.newEventStartTime}
        onCreate={handleCreateTask}
      />

      <EventModal
        isOpen={calendarState.showEventDetailsModal}
        onClose={() => calendarState.setShowEventDetailsModal(false)}
        event={calendarState.selectedEvent}
        onDelete={handleDeleteTask}
        onUpdate={handleUpdateTask}
      />
    </DndContext>
  )
}