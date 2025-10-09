"use client"

import { useState, useCallback } from "react"
import { format, addMonths, subMonths, addDays } from "date-fns"
import type { Occurrence, ViewType } from "@/types/calendar-types"
import type { Task } from "@/types/task-types"

interface UseCalendarStateProps {
  initialEvents?: Occurrence[]
  initialDate?: Date
}


export function useCalendarState({
  initialEvents = [],
  initialDate = new Date(),
}: UseCalendarStateProps = {}) {
  const [currentDate, setCurrentDate] = useState(initialDate)
  const [events, setEvents] = useState<Occurrence[]>(initialEvents)
  const [view, setView] = useState<ViewType>("month")
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([])

  // Event modal state
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [newEventTitle, setNewEventTitle] = useState("")
  const [newEventStartTime, setNewEventStartTime] = useState("")
  const [newEventEndTime, setNewEventEndTime] = useState("")

  // Event details modal state
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Occurrence | null>(null)

  // Navigation functions
  const handlePrevPeriod = useCallback(() => {
    if (view === "day") {
      setCurrentDate((prev) => addDays(prev, -1))
    } else if (view === "week") {
      setCurrentDate((prev) => addDays(prev, -7))
    } else {
      setCurrentDate((prev) => subMonths(prev, 1))
    }
  }, [view])

  const handleNextPeriod = useCallback(() => {
    if (view === "day") {
      setCurrentDate((prev) => addDays(prev, 1))
    } else if (view === "week") {
      setCurrentDate((prev) => addDays(prev, 7))
    } else {
      setCurrentDate((prev) => addMonths(prev, 1))
    }
  }, [view])

  const handleToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const handleGetEvents = async (windowStart: Date, windowEnd: Date) => {
    try {
      const res = await fetch(`/api/tasks?startDate=${windowStart.toISOString()}&endDate=${windowEnd.toISOString()}`)
      if (!res.ok && res.status !== 200) throw new Error("Failed to get events")
      const fetchedEvents = await res.json()
      console.log("events", fetchedEvents)
      setEvents(fetchedEvents)
    } catch (e) {
      console.error("Failed to get events:", e)
      alert("Failed to get events. Please try again.")
    }
  }

  const handleDeleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" })
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete task")

      setEvents((prev) => prev.filter((event) => event.id !== id))
    } catch (e) {
      console.error("Failed to delete task:", e)
      alert("Failed to delete task. Please try again.")
    }
  }

  const handleUpdateEvent = async (id: string, updates: Partial<Task>) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        throw new Error(`Failed to update task: ${res.status}`)
      }

      const updatedTask = await res.json()
      console.log("[v0] Updated task via API:", id, updates)
      
      // Return the updated task for the caller to handle
      return updatedTask
    } catch (err: any) {
      console.error("Error updating task:", err)
      // Re-throw the error so the caller can handle it (for optimistic updates)
      throw err
    }
  }

  const handleCreateEvent = async (eventData: {
    title: string
    description: string
    date: string
    startTime: string
    endTime: string
  }) => {
    try {
      const startDate = new Date(`${eventData.date}T${eventData.startTime}:00`);
      const endDate = new Date(`${eventData.date}T${eventData.endTime}:00`);
  
      // Make API call to create the task
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: eventData.title,
          description: eventData.description,
          status: 'TODO',
          priority: 'MEDIUM',
          scheduledDate: eventData.date,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          color: '#3b82f6',
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.status}`);
      }
  
      const newTask = await response.json();
  
      // Create the event with the actual task data using new structure
      const newEvent: Occurrence = {
        id: `${newTask.id}-${eventData.date}`,
        taskId: newTask.id,
        goalId: newTask.goalId || "",
        title: newTask.title,
        description: newTask.description || '',
        date: new Date(eventData.date),
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        color: newTask.color || '#3b82f6',
        status: newTask.status || 'TODO',
        occurrenceType: 'SINGLE',
        hasOverride: false,
      };
  
      // Add the new event to the calendar
      setEvents(prev => [...prev, newEvent]);
  
      // Reset the form
      setNewEventTitle('');
      setNewEventStartTime('');
      setNewEventEndTime('');
      setShowEventModal(false);
  
    } catch (error) {
      console.error('Error creating task:', error);
      // Show the modal again with the original data
      setNewEventTitle(eventData.title);
      setNewEventStartTime(eventData.startTime);
      setNewEventEndTime(eventData.endTime);
      setShowEventModal(true);
      alert('Failed to create event. Please try again.');
    }
  }

  // Filter functions
  const getFilteredEvents = useCallback(
    (todos: Task[]) => {
      if (selectedGoalIds.length === 0) return events

      return events.filter((event) => {
        if (event.taskId && event.taskId !== `temp-${event.id}`) {
          const relatedTodo = todos.find((todo) => todo.id === event.taskId)
          return relatedTodo?.goalId && selectedGoalIds.includes(relatedTodo.goalId)
        }
        return false
      })
    },
    [events, selectedGoalIds],
  )

  const getDateRangeText = useCallback(() => {
    if (view === "day") {
      return format(currentDate, "MMMM d, yyyy")
    } else if (view === "week") {
      const startDate = addDays(currentDate, -currentDate.getDay())
      const endDate = addDays(startDate, 6)
      return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`
    } else {
      return format(currentDate, "MMMM yyyy")
    }
  }, [view, currentDate])

  return {
    // State
    currentDate,
    setCurrentDate,
    events,
    setEvents,
    view,
    setView,
    selectedGoalIds,
    setSelectedGoalIds,

    // Event modal state
    showEventModal,
    setShowEventModal,
    selectedDate,
    setSelectedDate,
    newEventTitle,
    setNewEventTitle,
    newEventStartTime,
    setNewEventStartTime,
    newEventEndTime,
    setNewEventEndTime,

    // Event details modal state
    showEventDetailsModal,
    setShowEventDetailsModal,
    selectedEvent,
    setSelectedEvent,

    // Functions
    handlePrevPeriod,
    handleNextPeriod,
    handleToday,
    handleGetEvents,
    handleCreateEvent,
    handleDeleteEvent,
    handleUpdateEvent,
    getFilteredEvents,
    getDateRangeText,
  }
}
