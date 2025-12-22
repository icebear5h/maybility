"use client"

import { useState, useEffect } from "react"
import { X, Repeat, Clock, CalendarIcon, MapPin, Link as LinkIcon, Tag, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Goal, Stage } from "@/lib/types"

interface Event {
  id?: string
  title: string
  description?: string
  location?: string
  url?: string
  startTime: Date | string
  endTime: Date | string
  timezone: string
  isAllDay: boolean
  status: 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED'
  visibility: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL'
  color?: string
  rrule?: string
  goalId?: string
  stageId?: string
}

interface EventEditorProps {
  event?: Event | null
  isOpen: boolean
  onClose: () => void
  onSaved?: (event: Event) => void
  initialDate?: Date
  prefillGoalId?: string
  prefillStageId?: string
  goals?: Goal[]
  mode?: 'event' | 'task' // Whether creating a task or event
}

export function EventEditor({
  event,
  isOpen,
  onClose,
  onSaved,
  initialDate,
  prefillGoalId,
  prefillStageId,
  goals = [],
  mode = 'event',
}: EventEditorProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [url, setUrl] = useState("")
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [isAllDay, setIsAllDay] = useState(false)
  const [status, setStatus] = useState<'TENTATIVE' | 'CONFIRMED' | 'CANCELLED'>('CONFIRMED')
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL'>('PRIVATE')
  const [color, setColor] = useState<string>()
  const [goalId, setGoalId] = useState<string>()
  const [stages, setStages] = useState<Stage[]>([])
  const [stageId, setStageId] = useState<string>()
  const [showRecurrence, setShowRecurrence] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<"none" | "daily" | "weekly" | "monthly">("none")
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([])
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Separate collapsible sections
  const [showDescription, setShowDescription] = useState(false)
  const [showDueDate, setShowDueDate] = useState(false)
  const [showTime, setShowTime] = useState(false)
  const [showLocation, setShowLocation] = useState(false)

  // Task-specific fields
  const [taskStatus, setTaskStatus] = useState<'TODO' | 'IN_PROGRESS' | 'DONE'>('TODO')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [dueDate, setDueDate] = useState("")

  // Get user timezone (fallback to UTC)
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description || "")
      setLocation(event.location || "")
      setUrl(event.url || "")

      const eventStart = new Date(event.startTime)
      const eventEnd = new Date(event.endTime)

      // Use local date parts instead of ISO string to avoid timezone shifts
      const year = eventStart.getFullYear()
      const month = String(eventStart.getMonth() + 1).padStart(2, '0')
      const day = String(eventStart.getDate()).padStart(2, '0')
      setStartDate(`${year}-${month}-${day}`)
      setStartTime(eventStart.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }))
      setEndTime(eventEnd.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }))
      setIsAllDay(event.isAllDay)
      setStatus(event.status)
      setVisibility(event.visibility)
      setColor(event.color)
      setGoalId(event.goalId)
      setStageId(event.stageId)

      // Parse rrule if present
      if (event.rrule) {
        // Basic rrule parsing (simplified)
        if (event.rrule.includes('DAILY')) setRecurrenceType('daily')
        else if (event.rrule.includes('WEEKLY')) setRecurrenceType('weekly')
        else if (event.rrule.includes('MONTHLY')) setRecurrenceType('monthly')
      }
    } else if (initialDate) {
      // New event with initial date
      setTitle("")
      setDescription("")
      setLocation("")
      setUrl("")
      // Use local date parts instead of ISO string to avoid timezone shifts
      const year = initialDate.getFullYear()
      const month = String(initialDate.getMonth() + 1).padStart(2, '0')
      const day = String(initialDate.getDate()).padStart(2, '0')
      setStartDate(`${year}-${month}-${day}`)
      setStartTime(initialDate.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }))

      const defaultEnd = new Date(initialDate)
      defaultEnd.setHours(defaultEnd.getHours() + 1)
      setEndTime(defaultEnd.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }))

      setIsAllDay(false)
      setStatus('CONFIRMED')
      setVisibility('PRIVATE')
      setGoalId(prefillGoalId)
      setStageId(prefillStageId)
      setRecurrenceType("none")
      setRecurrenceDays([])
      setRecurrenceEndDate("")
    }
  }, [event, initialDate, prefillGoalId, prefillStageId, isOpen])

  useEffect(() => {
    if (!goalId || goalId === "__none__") {
      setStages([])
      setStageId(undefined)
      return
    }

    const selectedGoal = goals.find(g => g.id === goalId)
    setStages((selectedGoal?.stages as Stage[] | undefined) ?? [])

    // Optional: clear stage selection if it doesn’t belong to this goal
    if (stageId && !selectedGoal?.stages?.some((stage: Stage) => stage.id === stageId)) {
      setStageId(undefined)
    }
  }, [goalId, goals, stageId])

  if (!isOpen) return null

  const buildRRule = (): string | undefined => {
    if (recurrenceType === "none") return undefined

    let rrule = "FREQ="
    switch (recurrenceType) {
      case "daily":
        rrule += "DAILY"
        break
      case "weekly":
        rrule += "WEEKLY"
        if (recurrenceDays.length > 0) {
          const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
          rrule += `;BYDAY=${recurrenceDays.map(d => days[d]).join(',')}`
        }
        break
      case "monthly":
        rrule += "MONTHLY"
        break
    }

    if (recurrenceEndDate) {
      const endDate = new Date(recurrenceEndDate)
      const until = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      rrule += `;UNTIL=${until}`
    }

    return rrule
  }

  const handleSave = async () => {
    if (!title.trim()) {
      alert(`Please enter a title for the ${mode}`)
      return
    }

    setIsSaving(true)
    try {
      const eventData: any = {
        title: title || `Untitled ${mode === 'task' ? 'Task' : 'Event'}`,
        description,
        color,
      }

      // For tasks, include task-specific fields
      if (mode === 'task') {
        eventData.taskStatus = taskStatus
        eventData.priority = priority
        if (dueDate) eventData.dueDate = new Date(dueDate).toISOString()
        // Tasks may or may not have scheduled times
        if (startDate && startTime && endTime) {
          const [year, month, day] = startDate.split("-").map(Number)
          const [startHour, startMinute] = startTime.split(":").map(Number)
          const [endHour, endMinute] = endTime.split(":").map(Number)
          const startDateTime = new Date(year, month - 1, day, startHour, startMinute)
          const endDateTime = new Date(year, month - 1, day, endHour, endMinute)
          eventData.startTime = startDateTime.toISOString()
          eventData.endTime = endDateTime.toISOString()
          eventData.timezone = userTimezone
          eventData.isAllDay = isAllDay
        }
      } else {
        // For events, require scheduled time
        if (!startDate || !startTime || !endTime) {
          alert('Please enter start and end times for the event')
          setIsSaving(false)
          return
        }
        const [year, month, day] = startDate.split("-").map(Number)
        const [startHour, startMinute] = startTime.split(":").map(Number)
        const [endHour, endMinute] = endTime.split(":").map(Number)
        const startDateTime = new Date(year, month - 1, day, startHour, startMinute)
        const endDateTime = new Date(year, month - 1, day, endHour, endMinute)
        eventData.startTime = startDateTime.toISOString()
        eventData.endTime = endDateTime.toISOString()
        eventData.timezone = userTimezone
        eventData.isAllDay = isAllDay
        eventData.eventStatus = status
        eventData.visibility = visibility
        eventData.location = location
        eventData.url = url
        eventData.rrule = buildRRule()
      }

      if (goalId) eventData.goalId = goalId
      if (stageId) eventData.stageId = stageId

      let savedEvent: Event
      if (event?.id) {
        // Update existing event
        const res = await fetch(`/api/events/${event.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        })

        if (!res.ok) throw new Error('Failed to update event')
        savedEvent = await res.json()
      } else {
        // Create new event
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        })

        if (!res.ok) throw new Error('Failed to create event')
        savedEvent = await res.json()
      }

      onSaved?.(savedEvent)
      onClose()
    } catch (error) {
      console.error('Error saving event:', error)
      alert('Failed to save event. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!event?.id) return

    if (!confirm('Are you sure you want to delete this event?')) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete event')

      onClose()
      onSaved?.(null as any) // Signal deletion
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleRecurrenceDay = (day: number) => {
    setRecurrenceDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3 bg-card">
          <h2 className="text-base font-semibold">
            {event ? `Edit ${mode === 'task' ? 'Task' : 'Event'}` : `New ${mode === 'task' ? 'Task' : 'Event'}`}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isSaving}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          {/* Title */}
          <Input
            placeholder={mode === 'task' ? 'Task title' : 'Event title'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-base font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0"
            disabled={isSaving}
            autoFocus
          />

          {/* Task-specific mandatory fields */}
          {mode === 'task' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={taskStatus} onValueChange={(v: any) => setTaskStatus(v)} disabled={isSaving}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)} disabled={isSaving}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Event-specific mandatory fields */}
          {mode === 'event' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isSaving}
                className="text-sm"
              />
            </div>
          )}

          {/* Collapsible: Description */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowDescription(!showDescription)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDescription ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showDescription ? 'Hide description' : 'Add description'}
            </button>
            {showDescription && (
              <Textarea
                placeholder="Add description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[60px] resize-none text-sm"
                disabled={isSaving}
              />
            )}
          </div>

          {/* Task: Collapsible due date */}
          {mode === 'task' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowDueDate(!showDueDate)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showDueDate ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showDueDate ? 'Hide due date' : 'Add due date'}
              </button>
              {showDueDate && (
                <div className="space-y-1.5">
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={isSaving}
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* Event: Collapsible time */}
          {mode === 'event' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowTime(!showTime)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showTime ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showTime ? 'Hide time' : 'Add time'}
              </button>
              {showTime && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Time</label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAllDay}
                        onChange={(e) => setIsAllDay(e.target.checked)}
                        className="rounded border-border"
                        disabled={isSaving}
                      />
                      <span className="text-xs text-muted-foreground">All day</span>
                    </label>
                  </div>
                  {!isAllDay && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        disabled={isSaving}
                        className="text-sm"
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        disabled={isSaving}
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Event: Collapsible location */}
          {mode === 'event' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowLocation(!showLocation)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showLocation ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showLocation ? 'Hide location' : 'Add location'}
              </button>
              {showLocation && (
                <div className="space-y-1.5">
                  <Input
                    placeholder="Add location or link"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={isSaving}
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-card">
          {event?.id && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={isSaving}
            >
              Delete
            </Button>
          )}
          <div className={cn("flex gap-2", !event?.id && "ml-auto")}>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
