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
  initialDate = new Date() 
}: UseCalendarStateProps = {}) {
  const [currentDate, setCurrentDate] = useState(initialDate)
  const [events, setEvents] = useState<Occurrence[]>(initialEvents)
  const [view, setView] = useState<ViewType>("month")
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([])
  const [showGoalDropdown, setShowGoalDropdown] = useState(false)

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

  // Event operations
  const handleCreateEvent = useCallback(() => {
    if (newEventTitle.trim() && newEventStartTime && newEventEndTime) {
      const newEvent: Occurrence = {
        id: `event-${Date.now()}`,
        taskId: `temp-${Date.now()}`,
        title: newEventTitle,
        description: "",
        startUtc: new Date(`${selectedDate}T${newEventStartTime}:00`).toISOString(),
        endUtc: new Date(`${selectedDate}T${newEventEndTime}:00`).toISOString(),
        color: "#1e40af",
        status: "TODO",
        source: "SINGLE",
        isRecurring: false,
        hasOverride: false
      }
      setEvents((prev) => [...prev, newEvent])
      setNewEventTitle("")
      setNewEventStartTime("")
      setNewEventEndTime("")
      setShowEventModal(false)
    }
  }, [newEventTitle, newEventStartTime, newEventEndTime, selectedDate])

  const handleEventClick = useCallback((event: Occurrence) => {
    setSelectedEvent(event)
    setShowEventDetailsModal(true)
  }, [])

  const handleDeleteEvent = useCallback((eventId: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== eventId))
    setShowEventDetailsModal(false)
  }, [])

  const handleUpdateEvent = useCallback((eventId: string, updates: Partial<Occurrence>) => {
    setEvents((prev) => prev.map((event) => (event.id === eventId ? { ...event, ...updates } : event)))
  }, [])

  const handleTimeSlotClick = useCallback((date: string, time: string) => {
    setSelectedDate(date)
    setNewEventStartTime(time)
    const [hours, minutes] = time.split(":").map(Number)
    const endTime = `${(hours + 1).toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
    setNewEventEndTime(endTime)
    setShowEventModal(true)
  }, [])

  // Filter functions
  const getFilteredEvents = useCallback((todos: Task[]) => {
    if (selectedGoalIds.length === 0) return events

    return events.filter((event) => {
      if (event.taskId && event.taskId !== `temp-${event.id}`) {
        const relatedTodo = todos.find((todo) => todo.id === event.taskId)
        return relatedTodo?.goalId && selectedGoalIds.includes(relatedTodo.goalId)
      }
      return false
    })
  }, [events, selectedGoalIds])

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
    showGoalDropdown,
    setShowGoalDropdown,
    
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
    handleCreateEvent,
    handleEventClick,
    handleDeleteEvent,
    handleUpdateEvent,
    handleTimeSlotClick,
    getFilteredEvents,
    getDateRangeText,
  }
}
