"use client"

import { useState, useRef } from "react"
import { DndContext, DragOverlay } from "@dnd-kit/core"
import { TaskSidebar } from "@/components/calendar/task-sidebar"
import { WeekView } from "@/components/calendar/week-view"
import { DayView } from "@/components/calendar/day-view"
import { MonthView } from "@/components/calendar/month-view"
import { CalendarNavigation } from "@/components/calendar/calendar-navigation"
import { EventModal } from "@/components/calendar/event-modal"
import { EventDetailsModal } from "@/components/calendar/event-details-modal"
import { EventCard } from "@/components/calendar/event-card"
import { useCalendarState } from "@/hooks/use-calendar-state"
import { useCalendarDrag } from "@/hooks/use-calendar-drag"
import type { Task } from "@/types/task-types"
import type { Occurrence } from "@/types/calendar-types"

// Mock data - in a real app, this would come from your API/database
const MOCK_EVENTS: Occurrence[] = [
  { 
    id: "1:2025-08-04T09:00:00.000Z", 
    taskId: "1", 
    title: "Team Meeting", 
    description: "Weekly team meeting",
    startUtc: "2025-08-04T09:00:00.000Z", 
    endUtc: "2025-08-04T10:30:00.000Z", 
    color: "#1e40af", 
    status: "TODO",
    source: "SINGLE",
    isRecurring: false,
    hasOverride: false
  },
  { 
    id: "2:2025-08-06T14:15:00.000Z", 
    taskId: "2", 
    title: "Project Review", 
    description: "Review project progress",
    startUtc: "2025-08-06T14:15:00.000Z", 
    endUtc: "2025-08-06T15:45:00.000Z", 
    color: "#16a34a", 
    status: "TODO",
    source: "SINGLE",
    isRecurring: false,
    hasOverride: false
  },
]

const MOCK_GOALS = [
  { id: "goal-1", title: "Launch Personal Website", color: "#3b82f6" },
  { id: "goal-2", title: "Learn React Advanced Patterns", color: "#10b981" },
  { id: "goal-3", title: "Build Side Business", color: "#f59e0b" },
  { id: "goal-4", title: "Get AWS Certification", color: "#8b5cf6" },
]

const MOCK_TODOS: Task[] = [
  {
    id: "1",
    title: "Review quarterly reports",
    description: "Review quarterly financial reports",
    status: "TODO",
    priority: "MEDIUM",
    color: "#3b82f6",
    startTime: null,
    endTime: null,
    dueDate: new Date("2025-08-14T09:00:00Z"),
    scheduledDate: null,
    estimatedDuration: 60,
    userId: "user1",
    goalId: "goal-3",
    rrule: null,
    dtstart: null,
    timezone: "America/Los_Angeles",
    createdAt: new Date("2025-08-14T09:00:00Z"),
    updatedAt: new Date("2025-08-14T09:00:00Z"),
  },
  {
    id: "2",
    title: "Update project documentation",
    description: "Update project documentation and README",
    status: "TODO",
    priority: "MEDIUM",
    color: "#3b82f6",
    startTime: null,
    endTime: null,
    dueDate: new Date("2025-08-14T10:00:00Z"),
    scheduledDate: null,
    estimatedDuration: 120,
    userId: "user1",
    goalId: "goal-1",
    rrule: null,
    dtstart: null,
    timezone: "America/Los_Angeles",
    createdAt: new Date("2025-08-14T10:00:00Z"),
    updatedAt: new Date("2025-08-14T10:00:00Z"),
  },
]

export default function CalendarWithTasksRefactored() {
  const [todos, setTodos] = useState<Task[]>(MOCK_TODOS)
  const containerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Use custom hooks for state management
  const calendarState = useCalendarState({
    initialEvents: MOCK_EVENTS,
    initialDate: new Date("2025-08-04")
  })

  // Todo management functions
  const handleAddTodo = (title: string) => {
    const newTodo: Task = {
      id: Date.now().toString(),
      title,
      status: "TODO",
      priority: "MEDIUM",
      userId: "user1",
      goalId: null,
      rrule: null,
      dtstart: null,
      timezone: "America/Los_Angeles",
      createdAt: new Date(),
      updatedAt: new Date(),
      description: "",
      dueDate: null,
      scheduledDate: null,
      startTime: null,
      endTime: null,
      estimatedDuration: null,
      color: "#3b82f6",
    }
    setTodos((prev) => [...prev, newTodo])
  }

  const handleToggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              status: todo.status === "DONE" ? "TODO" : "DONE",
              completedAt: todo.status === "TODO" ? new Date() : undefined,
              updatedAt: new Date(),
            }
          : todo,
      ),
    )
  }

  const handleDeleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id))
    calendarState.setEvents((prev) => prev.filter((event) => event.taskId !== id))
  }

  const handleUpdateTodo = (id: string, updates: Partial<Task>) => {
    setTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, ...updates, updatedAt: new Date() } : todo)),
    )
  }

  // Use drag hook
  const dragHandlers = useCalendarDrag({
    events: calendarState.events,
    setEvents: calendarState.setEvents,
    containerRefs,
    onUpdateTodo: handleUpdateTodo,
    currentView: calendarState.view
  })

  // Enhanced event click handler that respects drag state
  const handleEventClick = (event: Occurrence) => {
    if (dragHandlers.hasDragged) {
      return
    }
    calendarState.handleEventClick(event)
  }

  // Enhanced delete handler that also removes scheduled date from todo
  const handleDeleteEvent = (eventId: string) => {
    const eventToDelete = calendarState.events.find((e) => e.id === eventId)
    if (eventToDelete?.taskId && eventToDelete.taskId !== `temp-${eventId}`) {
      handleUpdateTodo(eventToDelete.taskId, { scheduledDate: null })
    }
    calendarState.handleDeleteEvent(eventId)
  }

  // Filter data based on selected goals
  const filteredEvents = calendarState.getFilteredEvents(todos)
  const filteredTodos = calendarState.selectedGoalIds.length === 0 
    ? todos 
    : todos.filter((todo) => todo.goalId && calendarState.selectedGoalIds.includes(todo.goalId))

  // Render the appropriate calendar view
  const renderCalendarView = () => {
    const commonProps = {
      currentDate: calendarState.currentDate,
      events: filteredEvents,
      dragState: dragHandlers.dragState,
      onEventClick: handleEventClick,
      onMouseDown: dragHandlers.handleMouseDown,
      containerRefs,
      dragOverDate: dragHandlers.dragOverDate,
    }

    switch (calendarState.view) {
      case "day":
        return <DayView {...commonProps} onTimeSlotClick={calendarState.handleTimeSlotClick} />
      case "week":
        return <WeekView {...commonProps} onTimeSlotClick={calendarState.handleTimeSlotClick} />
      case "month":
      default:
        return <MonthView {...commonProps} onTimeSlotClick={calendarState.handleTimeSlotClick} hasDragged={dragHandlers.hasDragged} />
    }
  }

  return (
    <DndContext 
      onDragStart={dragHandlers.handleDragStart} 
      onDragEnd={dragHandlers.handleDragEnd}
    >
      <div className="flex gap-5 h-[calc(100vh-120px)]">
        {/* Task Sidebar */}
        <TaskSidebar
          todos={filteredTodos}
          onAddTodo={handleAddTodo}
          onToggleTodo={handleToggleTodo}
          onDeleteTodo={handleDeleteTodo}
          onUpdateTodo={handleUpdateTodo}
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
            goals={MOCK_GOALS}
            selectedGoalIds={calendarState.selectedGoalIds}
            onGoalSelectionChange={calendarState.setSelectedGoalIds}
            showGoalDropdown={calendarState.showGoalDropdown}
            onToggleGoalDropdown={() => calendarState.setShowGoalDropdown(!calendarState.showGoalDropdown)}
          />

          {/* Calendar View */}
          <div className="flex-1 bg-white">
            {renderCalendarView()}
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {dragHandlers.activeDragItem ? (
          dragHandlers.activeDragItem.type === "todo" ? (
            <div className="bg-white p-2 rounded shadow-lg border">
              {dragHandlers.activeDragItem.todo.title}
            </div>
          ) : (
            <EventCard event={dragHandlers.activeDragItem} />
          )
        ) : null}
      </DragOverlay>

      {/* Modals */}
      <EventModal
        isOpen={calendarState.showEventModal}
        onClose={() => calendarState.setShowEventModal(false)}
        selectedDate={calendarState.selectedDate}
        newEventTitle={calendarState.newEventTitle}
        setNewEventTitle={calendarState.setNewEventTitle}
        newEventStartTime={calendarState.newEventStartTime}
        setNewEventStartTime={calendarState.setNewEventStartTime}
        newEventEndTime={calendarState.newEventEndTime}
        setNewEventEndTime={calendarState.setNewEventEndTime}
        onCreateEvent={calendarState.handleCreateEvent}
      />

      <EventDetailsModal
        isOpen={calendarState.showEventDetailsModal}
        onClose={() => calendarState.setShowEventDetailsModal(false)}
        event={calendarState.selectedEvent}
        onDelete={handleDeleteEvent}
      />
    </DndContext>
  )
} 
