"use client"

import { useState, useCallback, useEffect } from "react"
import { format, addMonths, subMonths, addDays } from "date-fns"
import { DateTime } from 'luxon'
import type { Occurrence, ViewType, RecurrenceEditType } from "@/types/calendar-types"
import type { Task } from "@/types/task-types"
import { expandToOccurrences, occurrenceToDisplay } from "@/lib/series-expansion"
import { utcToTimezone, timezoneToUtc } from "@/lib/timezone-utils"

interface UseCalendarStateProps {
  initialEvents?: Occurrence[]
  initialDate?: Date
}


export function useCalendarState({
  initialEvents = [],
  initialDate = new Date(),
}: UseCalendarStateProps = {}) {
  // Initialize viewerTz immediately with browser timezone, then fetch user preference
  const [viewerTz, setViewerTz] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )
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

  // Fetch user's saved timezone preference on mount (overrides browser default)
  useEffect(() => {
    fetch(`/api/user?field=timezone`)
      .then(res => res.json())
      .then(data => {
        if (data.timezone) {
          setViewerTz(data.timezone)
        }
      })
      .catch(error => {
        console.error("Error fetching user timezone:", error)
        // Keep using browser timezone (already set in initial state)
      })
  }, [])

  const handleGetEvents = async (windowStart: Date, windowEnd: Date) => {
    try {
      // Expand window by 1 day on each end to account for timezone differences
      const expandedStart = new Date(windowStart)
      expandedStart.setDate(expandedStart.getDate() - 1)
      expandedStart.setHours(0, 0, 0, 0) // Start of day in local time
      
      const expandedEnd = new Date(windowEnd)
      expandedEnd.setDate(expandedEnd.getDate() + 1)
      expandedEnd.setHours(23, 59, 59, 999) // End of day in local time
      
      // Format as YYYY-MM-DD strings in viewer's timezone
      const startStr = DateTime.fromJSDate(expandedStart).toFormat('yyyy-MM-dd')
      const endStr = DateTime.fromJSDate(expandedEnd).toFormat('yyyy-MM-dd')
      
      // Convert to UTC for the API query using viewer's timezone
      const startUtc = timezoneToUtc(`${startStr}T00:00:00`, viewerTz!)
      const endUtc = timezoneToUtc(`${endStr}T23:59:59`, viewerTz!)
      
      if (!startUtc || !endUtc) {
        console.error("[handleGetEvents] Failed to convert to UTC")
        throw new Error("Failed to convert dates to UTC")
      }
      
      const startISO = startUtc.toISO()
      const endISO = endUtc.toISO()
      
      // console.log("[handleGetEvents] Fetching tasks for expanded window:", {
      //   original: { start: windowStart, end: windowEnd },
      //   expanded: { start: expandedStart, end: expandedEnd },
      //   dateStrings: { start: startStr, end: endStr },
      //   viewerTz,
      //   utc: { start: startISO, end: endISO }
      // })
      // console.log("[handleGetEvents] Query URL:", `/api/tasks?startDate=${startISO}&endDate=${endISO}`)

      const res = await fetch(`/api/tasks?startDate=${startISO}&endDate=${endISO}`)
      console.log("[handleGetEvents] Response status:", res.status, res.ok)
      if (!res.ok && res.status !== 200) {
        const errorText = await res.text()
        console.error("[handleGetEvents] API error:", errorText)
        throw new Error(`Failed to get events: ${res.status} ${errorText}`)
      }
      const tasks = await res.json()
      console.log("[handleGetEvents] Tasks fetched:", tasks)
      console.log("[handleGetEvents] Tasks count:", tasks.length)
      if (tasks.length > 0) {
        console.log("[handleGetEvents] First task:", tasks[0])
      }
      
      // Expand tasks to occurrences client-side
      // Use the expanded window for expansion to capture edge events
      const windowStartUtc = startUtc.toISO()!
      const windowEndUtc = endUtc.toISO()!
      
      // console.log("[handleGetEvents] Expansion window (UTC):", {
      //   start: windowStartUtc,
      //   end: windowEndUtc
      // })
      
      // Build exception and override maps
      const exceptionsMap = new Map<string, any[]>(
        tasks.map((t: any) => [t.id as string, t.exceptions || []])
      )
      const overridesMap = new Map<string, any[]>(
        tasks.map((t: any) => [t.id as string, t.overrides || []])
      )
      
      // Expand to occurrences
      const expandedOccurrences = expandToOccurrences(
        tasks,
        windowStartUtc,
        windowEndUtc,
        exceptionsMap,
        overridesMap
      )
      
      // Convert to display format (user's timezone)
      const displayOccurrences = expandedOccurrences.map(occ => 
        occurrenceToDisplay(occ, viewerTz)
      )
      
      console.log("[handleGetEvents] Expanded occurrences count:", expandedOccurrences.length)
      console.log("[handleGetEvents] Display occurrences count:", displayOccurrences.length)
      if (displayOccurrences.length > 0) {
        console.log("[handleGetEvents] First occurrence source field:", displayOccurrences[0].source)
        console.log("[handleGetEvents] Sample occurrence:", {
          id: displayOccurrences[0].id,
          title: displayOccurrences[0].title,
          source: displayOccurrences[0].source,
          seriesId: displayOccurrences[0].seriesId,
        })
      }
      // if (displayOccurrences.length > 0) {
      //   console.log("[handleGetEvents] First occurrence:", {
      //     id: displayOccurrences[0].id,
      //     title: displayOccurrences[0].title,
      //     date: displayOccurrences[0].date,
      //     dateType: typeof displayOccurrences[0].date,
      //     dateIsDate: displayOccurrences[0].date instanceof Date,
      //     startTime: displayOccurrences[0].startTime,
      //     endTime: displayOccurrences[0].endTime,
      //   })
      // }
      setEvents(displayOccurrences)
    } catch (e) {
      console.error("Failed to get events:", e)
      console.error("Error details:", {
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      })
      alert(`Failed to get events: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  
  const refetchEvents = useCallback(() => {
    const windowStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const windowEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    handleGetEvents(windowStart, windowEnd)
  }, [currentDate])

  const handleDeleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" })
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete task")

      // Remove all occurrences of this task (handles both single and recurring)
      setEvents((prev) => prev.filter((event) => {
        // Remove if it's the exact event OR if it's an occurrence of this series
        return event.id !== id && event.seriesId !== id && event.taskId !== id
      }))
    } catch (e) {
      console.error("Failed to delete task:", e)
      alert("Failed to delete task. Please try again.")
    }
  }

  const handleUpdateEvent = async (id: string, updates: Partial<Task> | any) => {
    try {
      console.log("[handleUpdateEvent] Received updates:", updates)
      const editType = updates.editType as RecurrenceEditType | undefined
      const occurrenceKey = updates.occurrenceKey as string | undefined
      const payload: any = { ...updates }
      
      // Handle payload based on edit type
      if (editType === 'this' && occurrenceKey) {
        // For override updates: send override data, not direct time updates
        const dateField = payload.date || payload.startDate
        
        if (payload.startTime && payload.endTime && dateField) {
          const localStart = dateField + "T" + payload.startTime
          const localEnd = dateField + "T" + payload.endTime
          const utcStart = timezoneToUtc(localStart, viewerTz!)
          const utcEnd = timezoneToUtc(localEnd, viewerTz!)

          if (!utcStart || !utcEnd) {
            throw new Error('Failed to convert times to UTC')
          }
          
          // Parse occurrenceKey to get originalStart
          const dateMatch = occurrenceKey.match(/-(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/)
          if (!dateMatch) {
            throw new Error('Invalid occurrence key format')
          }
          const originalStart = new Date(dateMatch[1])
          
          // Send as override data
          payload.overrides = [{
            originalStart,
            newStart: utcStart.toJSDate(),
            newEnd: utcEnd.toJSDate(),
            title: payload.title,
            description: payload.description,
            status: payload.status
          }]
          
          // Remove direct time updates
          delete payload.startTime
          delete payload.endTime
          delete payload.date
          delete payload.startDate
          
          console.log("[handleUpdateEvent] Prepared override data:", payload.overrides[0])
        }
      } else {
        // For direct updates: convert times to UTC
        const dateField = payload.date || payload.startDate
        
        if (payload.startTime && payload.endTime && dateField) {
          const localStart = dateField + "T" + payload.startTime
          const localEnd = dateField + "T" + payload.endTime
          const utcStart = timezoneToUtc(localStart, viewerTz!)
          const utcEnd = timezoneToUtc(localEnd, viewerTz!)

           if (!utcStart || !utcEnd) {
            throw new Error('Failed to convert times to UTC')
          }
          
          // Convert to JS Date objects (will serialize to ISO strings in JSON)
          payload.startTime = utcStart.toJSDate()
          payload.endTime = utcEnd.toJSDate()
          payload.timezone = viewerTz
          
          console.log("[handleUpdateEvent] After UTC conversion:", payload.startTime, payload.endTime)
        } else {
          console.log("[handleUpdateEvent] Skipping timezone conversion - missing data:", {
            hasStartTime: !!payload.startTime,
            hasEndTime: !!payload.endTime,
            hasDate: !!payload.date,
            hasStartDate: !!payload.startDate
          })
        }
      }

      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(`Failed to update task: ${res.status}`)
      }

      const updatedTask = await res.json()
      console.log("[handleUpdateEvent] Updated task from API:", updatedTask)
      
      
      
      // Check if occurrence type changed (SINGLE ↔ RRULE)
      const oldEvent = events.find(e => e.taskId === id || e.id === id)
      const typeChanged = oldEvent && oldEvent.source !== updatedTask.occurrenceType
      
      if (typeChanged) {
        console.log("[handleUpdateEvent] Occurrence type changed, re-expanding task")
        
        // Remove old occurrences
        setEvents(prev => prev.filter(e => e.taskId !== id && e.id !== id))
        
        // Add new occurrences
        if (updatedTask.occurrenceType === 'SINGLE') {
          // Converted to single event
          const displayStart = utcToTimezone(updatedTask.startTime, viewerTz!)
          const displayEnd = utcToTimezone(updatedTask.endTime, viewerTz!)
          
          if (displayStart && displayEnd) {
            const localDate = new Date(
              displayStart.year,
              displayStart.month - 1,
              displayStart.day
            )
            
            const newOccurrence: Occurrence = {
              id: updatedTask.id,
              seriesId: updatedTask.id,
              taskId: updatedTask.id,
              occurrenceKey: updatedTask.id,
              date: localDate,
              startTime: displayStart.toFormat('HH:mm'),
              endTime: displayEnd.toFormat('HH:mm'),
              title: updatedTask.title,
              description: updatedTask.description || '',
              color: updatedTask.color,
              status: updatedTask.status as "TODO" | "IN_PROGRESS" | "DONE",
              priority: updatedTask.priority,
              source: updatedTask.occurrenceType === 'SINGLE' ? 'SINGLE' : 'RRULE',
              timezone: updatedTask.timezone,
              hasOverride: false,
              isException: false,
            }
            
            setEvents(prev => [...prev, newOccurrence])
          }
        } else if (updatedTask.occurrenceType === 'RRULE') {
          
          // Handle recurring event edit types first
          if (editType === 'this' && occurrenceKey) {
            console.log("[handleUpdateEvent] Recurring single-occurrence edit detected, refreshing events")
            refetchEvents()
            return updatedTask
          }
          
          if (editType === 'following' && occurrenceKey) {
            console.log("[handleUpdateEvent] Series split detected, refreshing events")
            // Backend returns { originalTask, newTask } for 'following' edits
            refetchEvents()
            return updatedTask
          }
          
          if (editType === 'all') {
            console.log("[handleUpdateEvent] Series-wide edit detected, will update normally")
            // Fall through to expansion logic for 'all' case
          }
          
          // Converted to recurring event - expand it
          const windowStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
          const windowEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
          
          const expandedStart = new Date(windowStart)
          expandedStart.setDate(expandedStart.getDate() - 1)
          const expandedEnd = new Date(windowEnd)
          expandedEnd.setDate(expandedEnd.getDate() + 1)
          
          const startStr = expandedStart.toISOString().split('T')[0]
          const endStr = expandedEnd.toISOString().split('T')[0]
          
          const startUtc = timezoneToUtc(`${startStr}T00:00:00`, viewerTz!)
          const endUtc = timezoneToUtc(`${endStr}T23:59:59`, viewerTz!)
          
          if (startUtc && endUtc) {
            const expandedOccurrences = expandToOccurrences(
              [updatedTask],
              startUtc.toISO()!,
              endUtc.toISO()!,
              new Map(),
              new Map()
            )
            
            const displayOccurrences = expandedOccurrences.map(occ =>
              occurrenceToDisplay(occ, viewerTz)
            )
            
            setEvents(prev => [...prev, ...displayOccurrences])
          }
        }
        if (updatedTask.occurrenceType === 'OVERRIDE') {
          
        }
      } else {
        // Normal update (no type change)
        // Convert the updated task back to an occurrence for display
        if (updatedTask.startTime && updatedTask.endTime) {
          const displayStart = utcToTimezone(updatedTask.startTime, viewerTz!)
          const displayEnd = utcToTimezone(updatedTask.endTime, viewerTz!)
          
          if (displayStart && displayEnd) {
            // Create a Date object in local timezone from the display date
            const localDate = new Date(
              displayStart.year,
              displayStart.month - 1,
              displayStart.day
            )
            
            console.log("[handleUpdateEvent] Updating event display:", {
              utcStart: updatedTask.startTime,
              displayStart: displayStart.toISO(),
              localDate,
              localDateFormatted: localDate.toISOString().split('T')[0],
              startTime: displayStart.toFormat('HH:mm'),
              endTime: displayEnd.toFormat('HH:mm')
            })
            
            // Update the event in state with properly converted times
            setEvents(prev => prev.map(e => 
              e.taskId === id || e.id === id
                ? {
                    ...e,
                    date: localDate,
                    startTime: displayStart.toFormat('HH:mm'),
                    endTime: displayEnd.toFormat('HH:mm'),
                    title: updatedTask.title || e.title,
                    description: updatedTask.description || e.description,
                    status: updatedTask.status || e.status,
                    color: updatedTask.color || e.color,
                  }
                : e
            ))
          }
        }
      }
      
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
    startTime: string | Date
    endTime: string | Date
    rrule?: string
    occurrenceType?: "SINGLE" | "RRULE"
  }) => {
    try {
      // Only convert if startTime/endTime are strings (not already Date objects)
      if (typeof eventData.startTime === 'string' && typeof eventData.endTime === 'string' && eventData.date) {
        const localStart = eventData.date + "T" + eventData.startTime
        const localEnd = eventData.date + "T" + eventData.endTime
        const utcStart = timezoneToUtc(localStart, viewerTz!)
        const utcEnd = timezoneToUtc(localEnd, viewerTz!)
        
        if (!utcStart || !utcEnd) {
          throw new Error('Failed to convert times to UTC')
        }
        
        // Convert to JS Date objects (will serialize to ISO strings in JSON)
        eventData.startTime = utcStart.toJSDate()
        eventData.endTime = utcEnd.toJSDate()
      }
      const requestBody = {
        title: eventData.title,
        description: eventData.description,
        status: 'TODO',
        priority: 'MEDIUM',
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        timezone: viewerTz,
        color: '#3b82f6',
        isRecurring: eventData.occurrenceType === 'RRULE',
        rrule: eventData.rrule,
      }
      
      console.log('[handleCreateEvent] Sending to API:', requestBody)
  
      // Make API call to create the task
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[handleCreateEvent] API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        throw new Error(`Failed to create task: ${response.status} - ${JSON.stringify(errorData)}`);
      }
  
      const newTask = await response.json();
      console.log('[handleCreateEvent] Created task:', newTask)
  
      // Smart update: Expand the new task and add to state (no refetch needed)
      if (newTask.occurrenceType === 'SINGLE') {
        // Single event: Convert directly to occurrence
        const displayStart = utcToTimezone(newTask.startTime, viewerTz!)
        const displayEnd = utcToTimezone(newTask.endTime, viewerTz!)
        
        if (displayStart && displayEnd) {
          const localDate = new Date(
            displayStart.year,
            displayStart.month - 1,
            displayStart.day
          )
          
          const newOccurrence: Occurrence = {
            id: newTask.id,
            seriesId: newTask.id,
            taskId: newTask.id,
            occurrenceKey: newTask.id,
            date: localDate,
            startTime: displayStart.toFormat('HH:mm'),
            endTime: displayEnd.toFormat('HH:mm'),
            title: newTask.title,
            description: newTask.description || '',
            color: newTask.color,
            status: newTask.status as "TODO" | "IN_PROGRESS" | "DONE",
            priority: newTask.priority,
            source: newTask.occurrenceType === 'SINGLE' ? 'SINGLE' : 'RRULE',
            timezone: newTask.timezone,
            hasOverride: false,
            isException: false,
          }
          
          setEvents(prev => [...prev, newOccurrence])
        }
      } else if (newTask.occurrenceType === 'RRULE') {
        // Recurring event: Expand and add all occurrences
        const windowStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const windowEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        
        const expandedStart = new Date(windowStart)
        expandedStart.setDate(expandedStart.getDate() - 1)
        const expandedEnd = new Date(windowEnd)
        expandedEnd.setDate(expandedEnd.getDate() + 1)
        
        const startStr = expandedStart.toISOString().split('T')[0]
        const endStr = expandedEnd.toISOString().split('T')[0]
        
        const startUtc = timezoneToUtc(`${startStr}T00:00:00`, viewerTz!)
        const endUtc = timezoneToUtc(`${endStr}T23:59:59`, viewerTz!)
        
        if (startUtc && endUtc) {
          const expandedOccurrences = expandToOccurrences(
            [newTask],
            startUtc.toISO()!,
            endUtc.toISO()!,
            new Map(),
            new Map()
          )
          
          const displayOccurrences = expandedOccurrences.map(occ =>
            occurrenceToDisplay(occ, viewerTz)
          )
          
          setEvents(prev => [...prev, ...displayOccurrences])
        }
      }
  
      // Reset the form
      setNewEventTitle('');
      setNewEventStartTime('');
      setNewEventEndTime('');
      setShowEventModal(false);
  
    } catch (error) {
      console.error('Error creating task:', error);
      // Show the modal again with the original data
      setNewEventTitle(eventData.title);
      // Convert Date objects back to time strings for the form
      setNewEventStartTime(eventData.startTime instanceof Date ? eventData.startTime.toISOString().split('T')[1].substring(0, 5) : eventData.startTime);
      setNewEventEndTime(eventData.endTime instanceof Date ? eventData.endTime.toISOString().split('T')[1].substring(0, 5) : eventData.endTime);
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
    refetchEvents,
    viewerTz,
  }
}
