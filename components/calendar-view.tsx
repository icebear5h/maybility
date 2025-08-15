"use client"

import { useState } from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday } from "date-fns"

type CalendarEvent = {
  id: string
  title: string
  date: string
  color: 'green' | 'blue' | 'red'
}

const MOCK_EVENTS: CalendarEvent[] = [
  { id: "1", title: "Team Meeting", date: "2025-08-04", color: "blue" },
  { id: "2", title: "Project Review", date: "2025-08-06", color: "green" },
  { id: "3", title: "Client Call", date: "2025-08-06", color: "red" },
  { id: "4", title: "Design Workshop", date: "2025-08-15", color: "blue" },
  { id: "5", title: "Budget Planning", date: "2025-08-22", color: "green" },
]

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date("2025-08-01"))
  const [events, setEvents] = useState<CalendarEvent[]>(MOCK_EVENTS)
  const [draggedEvent, setDraggedEvent] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; eventId: string } | null>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1))
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1))
  const handleToday = () => setCurrentDate(new Date())

  const handleDragStart = (eventId: string) => {
    setDraggedEvent(eventId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetDate: string) => {
    e.preventDefault()
    if (draggedEvent) {
      setEvents(prev => prev.map(event => 
        event.id === draggedEvent 
          ? { ...event, date: targetDate }
          : event
      ))
      setDraggedEvent(null)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, eventId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, eventId })
  }

  const handleDeleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(event => event.id !== eventId))
    setContextMenu(null)
  }

  const handleDuplicateEvent = (eventId: string) => {
    const event = events.find(e => e.id === eventId)
    if (event) {
      const newEvent = { ...event, id: Date.now().toString(), title: `${event.title} (Copy)` }
      setEvents(prev => [...prev, newEvent])
    }
    setContextMenu(null)
  }

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="btn" onClick={handleToday}>Today</button>
          <button className="btn" onClick={handlePrevMonth}>‹</button>
          <button className="btn" onClick={handleNextMonth}>›</button>
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <div style={{ fontSize: '14px', color: '#666' }}>Month View</div>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map(day => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}
        
        {days.map(day => {
          const dateString = format(day, "yyyy-MM-dd")
          const dayEvents = events.filter(event => event.date === dateString)
          
          return (
            <div
              key={day.toString()}
              className={`calendar-day ${!isSameMonth(day, currentDate) ? 'other-month' : ''} ${isToday(day) ? 'today' : ''}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, dateString)}
            >
              <div className="day-number">
                {format(day, "d")}
              </div>
              {dayEvents.map(event => (
                <div
                  key={event.id}
                  className={`calendar-event ${event.color} ${draggedEvent === event.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(event.id)}
                  onContextMenu={(e) => handleContextMenu(e, event.id)}
                >
                  {event.title}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {contextMenu && (
        <>
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
            onClick={() => setContextMenu(null)}
          />
          <div 
            className="context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="context-menu-item" onClick={() => console.log('Edit', contextMenu.eventId)}>
              Edit
            </div>
            <div className="context-menu-item" onClick={() => handleDuplicateEvent(contextMenu.eventId)}>
              Duplicate
            </div>
            <div className="context-menu-item danger" onClick={() => handleDeleteEvent(contextMenu.eventId)}>
              Delete
            </div>
          </div>
        </>
      )}
    </div>
  )
}
