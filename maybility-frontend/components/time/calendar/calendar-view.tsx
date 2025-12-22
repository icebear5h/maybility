"use client"

import { format } from "date-fns"
import { Plus, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Task, Goal } from "@/lib/types"
import { cn } from "@/lib/utils"
import { getEventColorClasses, getColorFromHex, entryOccursOnDate } from "@/lib/calendar-utils"

import { useCalendarState } from "./hooks/useCalendarState"
import { useCalendarDrag } from "./hooks/useCalendarDrag"
import { useCalendarResize } from "./hooks/useCalendarResize"

import { CalendarHeader } from "./calendar-header"
import { MonthView } from "./month-view"
import { WeekView } from "./week-view"
import { DayView } from "./day-view"

interface CalendarViewProps {
  events?: any[]
  onSelectEvent?: (event: any) => void
  onCreateEvent?: (date?: Date) => void
  onUpdateEvent?: (event: any) => void
  isDraggingTask?: boolean
  onTaskDrop?: (task: Task, date: Date) => void
  goals?: Goal[]
}

export function CalendarView({
  events = [],
  onSelectEvent,
  onCreateEvent,
  onUpdateEvent,
  isDraggingTask = false,
  goals = [],
  onTaskDrop,
}: CalendarViewProps) {
  const {
    currentDate,
    setCurrentDate,
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    calendarDays,
    weekDays,
    navigate,
  } = useCalendarState()

  const { resizingEvent, handleResizeStart, handleResizeMove, handleResizeEnd } = useCalendarResize(onUpdateEvent)

  const {
    dropTarget,
    draggingEvent,
    handleEventDragStart,
    handleEventDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useCalendarDrag(onUpdateEvent, onTaskDrop, !!resizingEvent)

  const getEventsForDate = (date: Date): any[] => {
    return events.filter((event) => entryOccursOnDate(event, date))
  }

  const getEventColor = (event: any) => {
    if (event.goalId) {
      const goal = goals.find((g) => g.id === event.goalId)
      if (goal && goal.color) {
        const hexColor = getColorFromHex(goal.color)
        return {
          style: {
            backgroundColor: goal.color,
            color: hexColor.text,
            borderLeftColor: goal.color,
          },
          goalTitle: goal.title,
          isGoalColor: true,
        }
      }
    }
    const colorClasses = getEventColorClasses(event.color)
    return {
      classes: colorClasses,
      isGoalColor: false,
    }
  }

  const handleSelectEvent = (event: any) => {
    onSelectEvent?.(event)
  }

  return (
    <div className="flex h-full flex-col">
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onNavigate={navigate}
        onToday={() => setCurrentDate(new Date())}
        onViewModeChange={setViewMode}
      />

      <div className="flex-1 p-6 flex flex-col overflow-hidden">
        {viewMode === "month" && (
          <MonthView
            calendarDays={calendarDays}
            currentDate={currentDate}
            selectedDate={selectedDate}
            events={events}
            goals={goals}
            isDraggingTask={isDraggingTask}
            draggingEvent={draggingEvent}
            dropTarget={dropTarget}
            onSelectDate={setSelectedDate}
            onSelectEvent={handleSelectEvent}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onEventDragStart={handleEventDragStart}
            onEventDragEnd={handleEventDragEnd}
            getEventColor={getEventColor}
          />
        )}

        {viewMode === "week" && (
          <WeekView
            weekDays={weekDays}
            events={events}
            isDraggingTask={isDraggingTask}
            draggingEvent={draggingEvent}
            resizingEvent={resizingEvent}
            dropTarget={dropTarget}
            onSelectEvent={handleSelectEvent}
            onCreateEvent={onCreateEvent}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onEventDragStart={handleEventDragStart}
            onEventDragEnd={handleEventDragEnd}
            onResizeStart={handleResizeStart}
            onResizeMove={(e) => handleResizeMove(e.nativeEvent)}
            onResizeEnd={handleResizeEnd}
            getEventColor={getEventColor}
          />
        )}

        {viewMode === "day" && (
          <DayView
            currentDate={currentDate}
            events={events}
            isDraggingTask={isDraggingTask}
            draggingEvent={draggingEvent}
            resizingEvent={resizingEvent}
            dropTarget={dropTarget}
            onSelectEvent={handleSelectEvent}
            onCreateEvent={onCreateEvent}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onEventDragStart={handleEventDragStart}
            onEventDragEnd={handleEventDragEnd}
            onResizeStart={handleResizeStart}
            onResizeMove={(e) => handleResizeMove(e.nativeEvent)}
            onResizeEnd={handleResizeEnd}
            getEventColor={getEventColor}
          />
        )}
      </div>

      {viewMode === "month" && selectedDate && (
        <div className="absolute right-0 top-0 h-full w-80 border-l border-border/50 bg-card/95 backdrop-blur-sm p-4 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">{format(selectedDate, "EEEE, MMMM d")}</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
              Close
            </Button>
          </div>
          {getEventsForDate(selectedDate).length > 0 ? (
            <div className="space-y-2">
              {getEventsForDate(selectedDate).map((event) => {
                const eventColor = getEventColor(event)
                return (
                  <button
                    key={event.id}
                    onClick={() => onSelectEvent?.(event)}
                    style={eventColor.isGoalColor ? eventColor.style : {}}
                    className={cn(
                      "w-full rounded-lg p-3 text-left transition-all hover:opacity-80",
                      !eventColor.isGoalColor && eventColor.classes?.bg,
                      !eventColor.isGoalColor && eventColor.classes?.text,
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium flex-1">{event.title}</h4>
                      {eventColor.isGoalColor && <Target className="h-4 w-4 opacity-75" />}
                    </div>
                    {!event.isAllDay && (
                      <p className="text-sm opacity-75 mt-1">{format(new Date(event.createdAt), "h:mm a")}</p>
                    )}
                    {eventColor.isGoalColor && eventColor.goalTitle && (
                      <p className="text-xs opacity-60 mt-1">Goal: {eventColor.goalTitle}</p>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No events for this day</p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent"
                onClick={() => onCreateEvent?.(selectedDate)}
              >
                <Plus className="h-4 w-4" />
                Add Event
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
