"use client"

import { useState, useEffect } from "react"
import { X, Trash2, Save } from "lucide-react"
import type { Occurrence, RecurrenceConfig, RecurrenceEditType } from "@/types/calendar-types"
import { RecurrenceConfig as RecurrenceConfigComponent } from "@/components/calendar/rrule/recurrence-config"
import { RecurrenceEditModal } from "@/components/calendar/rrule/recurrence-edit-modal"
import { occurrenceToTaskUpdate } from "@/lib/occurrence-utils"
import { getDefaultEventTimes, ensureValidEndTime } from "@/lib/event-defaults"
import type { ViewType } from "@/types/calendar-types"

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate?: string | null
  newEventTitle: string
  setNewEventTitle: (title: string) => void
  newEventStartTime: string
  setNewEventStartTime: (time: string) => void
  newEventEndTime: string
  setNewEventEndTime: (time: string) => void
  onCreateEvent: (eventData: {
    title: string
    description: string
    startTime: string
    endTime: string
    date: string
    rrule?: string
    occurrenceType?: "SINGLE" | "RRULE"
  }) => void
  event?: Occurrence | null
  onUpdate?: (taskId: string, updates: any, editType?: RecurrenceEditType) => void
  onDelete?: (taskId: string, editType?: RecurrenceEditType) => void
  view?: ViewType  // Current calendar view for smart defaults
}

export function EventModal({
  isOpen,
  onClose,
  selectedDate,
  newEventTitle,
  setNewEventTitle,
  newEventStartTime,
  setNewEventStartTime,
  newEventEndTime,
  setNewEventEndTime,
  onCreateEvent,
  event,
  onUpdate,
  onDelete,
  view = 'month',
}: EventModalProps) {
  const isEditing = !!event
  const [description, setDescription] = useState("")
  const [isRecurring, setIsRecurring] = useState(false)
  const [showRecurrenceConfig, setShowRecurrenceConfig] = useState(false)
  const [recurrenceConfig, setRecurrenceConfig] = useState<RecurrenceConfig>({
    frequency: "WEEKLY",
    interval: 1,
  })
  const [rruleString, setRRuleString] = useState("")

  const [showRecurrenceEditModal, setShowRecurrenceEditModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<"save" | "delete" | null>(null)

  // Initialize form data when event changes or modal opens
  useEffect(() => {
    if (isEditing && event) {
      setNewEventTitle(event.title)
      setDescription(event.description || "")
      setIsRecurring(event.source === "RRULE" || event.source === "OVERRIDE")
      
      // Load rrule if it exists
      if (event.rrule) {
        setRRuleString(event.rrule)
        // TODO: Parse rrule back to config for UI
      }

      // Use the new date/startTime/endTime structure
      setNewEventStartTime(event.startTime)
      setNewEventEndTime(event.endTime)
    } else if (!isEditing) {
      setDescription("")
      setIsRecurring(false)
      setShowRecurrenceConfig(false)
      setRRuleString("")
      
      // Set smart defaults if times are empty
      if (!newEventStartTime || !newEventEndTime) {
        const defaults = getDefaultEventTimes(view, newEventStartTime)
        setNewEventStartTime(defaults.startTime)
        setNewEventEndTime(defaults.endTime)
      }
    }
  }, [event, isEditing, view, newEventStartTime, newEventEndTime, setNewEventTitle, setNewEventStartTime, setNewEventEndTime])

  if (!isOpen) return null

  const handleSave = () => {
    console.log("[EventModal] handleSave called:", {
      isRecurring,
      rruleString,
      isEditing,
      eventSource: event?.source
    })
    
    // Original save logic for non-recurring events or new events
    const title = newEventTitle.trim() || "Untitled Event"
    const startDate = selectedDate || new Date().toISOString().split("T")[0]

    // Validate time format and use smart defaults
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    const defaults = getDefaultEventTimes(view)
    const validStartTime = timeRegex.test(newEventStartTime) ? newEventStartTime : defaults.startTime
    const validEndTime = timeRegex.test(newEventEndTime) ? newEventEndTime : defaults.endTime

    // Ensure end time is after start time (minimum 30 minutes)
    const finalEndTime = ensureValidEndTime(validStartTime, validEndTime, 30)

    if (isEditing && event && onUpdate) {
      const occurrenceUpdates: Partial<Occurrence> = {
        title: title,
        description: description,
        date: new Date(startDate),
        startTime: validStartTime,
        endTime: finalEndTime,
        timezone: event.timezone,  // Preserve timezone from original event
        rrule: isRecurring ? rruleString : undefined,  // Pass rrule, occurrenceToTaskUpdate will set occurrenceType
      }

      console.log("[EventModal] Update - occurrenceUpdates:", occurrenceUpdates)
      
      // Convert Occurrence updates to Task updates for API
      const taskUpdates = occurrenceToTaskUpdate(occurrenceUpdates)
      console.log("[EventModal] Update - taskUpdates after conversion:", taskUpdates)
      
      // Check if this is a recurring event AND if recurrence properties changed
      const isRecurringEvent = event.source === "RRULE" || event.source === "OVERRIDE"
      const rruleChanged = event.rrule !== (isRecurring ? rruleString : undefined)
      
      // If editing recurrence properties, skip prompt and update all
      if (isRecurringEvent && rruleChanged) {
        console.log("[EventModal] RRule changed - updating all occurrences")
        onUpdate(event.seriesId || event.taskId || event.id, { ...taskUpdates, editType: "all" })
      } else if (isRecurringEvent) {
        // Other changes to recurring event - show prompt
        setPendingAction("save")
        setShowRecurrenceEditModal(true)
        return
      } else {
        // Non-recurring event - just update
        onUpdate(event.seriesId || event.taskId || event.id, taskUpdates)
      }
    } else if (!isEditing) {
      const createData = {
        title: title,
        description: description,
        startTime: validStartTime,
        endTime: finalEndTime,
        date: startDate,
        rrule: isRecurring ? rruleString : undefined,
        occurrenceType: (isRecurring ? "RRULE" : "SINGLE") as "SINGLE" | "RRULE",
      }
      console.log("[EventModal] Calling onCreateEvent with:", createData)
      onCreateEvent(createData)
    }

    onClose()
  }

  const handleDelete = () => {
    if (isEditing && event && (event.source === "RRULE" || event.source === "OVERRIDE") && onDelete) {
      setPendingAction("delete")
      setShowRecurrenceEditModal(true)
      return
    }

    // Original delete logic for non-recurring events
    if (isEditing && event && onDelete) {
      onDelete(event.taskId || event.id)
      onClose()
    }
  }

  const handleRecurrenceEditConfirm = (editType: RecurrenceEditType) => {
    if (!event) return

    if (pendingAction === "save" && onUpdate) {
      const title = newEventTitle.trim() || "Untitled Event"
      const startDate = selectedDate || new Date().toISOString().split("T")[0]

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      const validStartTime = timeRegex.test(newEventStartTime) ? newEventStartTime : "09:00"
      const validEndTime = timeRegex.test(newEventEndTime) ? newEventEndTime : "10:00"

      const startMinutes =
        Number.parseInt(validStartTime.split(":")[0]) * 60 + Number.parseInt(validStartTime.split(":")[1])
      const endMinutes = Number.parseInt(validEndTime.split(":")[0]) * 60 + Number.parseInt(validEndTime.split(":")[1])

      let finalEndTime = validEndTime
      if (endMinutes <= startMinutes) {
        const newEndMinutes = startMinutes + 60
        const newEndHours = Math.floor(newEndMinutes / 60)
        const newEndMins = newEndMinutes % 60

        if (newEndHours < 24) {
          finalEndTime = `${newEndHours.toString().padStart(2, "0")}:${newEndMins.toString().padStart(2, "0")}`
        } else {
          finalEndTime = "23:59"
        }
      }

      const occurrenceUpdates: Partial<Occurrence> = {
        title: title,
        description: description,
        date: new Date(startDate),
        startTime: validStartTime,
        endTime: finalEndTime,
        rrule: isRecurring ? rruleString : undefined,  // Pass rrule, occurrenceToTaskUpdate will set occurrenceType
      }

      // Convert Occurrence updates to Task updates for API
      const taskUpdates = occurrenceToTaskUpdate(occurrenceUpdates)
      // Add occurrenceKey for recurring event edits
      if (event.occurrenceKey) {
        taskUpdates.occurrenceKey = event.occurrenceKey
      }
      onUpdate(event.taskId || event.id, taskUpdates, editType)
    } else if (pendingAction === "delete" && onDelete) {
      onDelete(event.taskId || event.id, editType)
    }

    setPendingAction(null)
    onClose()
  }

  const handleRecurrenceEditCancel = () => {
    setShowRecurrenceEditModal(false)
    setPendingAction(null)
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[1000]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-[1001] w-[600px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h3 className="text-lg font-semibold text-stone-900">{isEditing ? "Edit Event" : "Create Event"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded transition-colors">
            <X className="h-5 w-5 text-stone-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Title *</label>
            <input
              type="text"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Event title"
              autoFocus={!isEditing}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Event description (optional)"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate || ""}
              readOnly
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-md text-stone-600"
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Start Time</label>
              <input
                type="time"
                value={newEventStartTime}
                onChange={(e) => setNewEventStartTime(e.target.value)}
                step="300"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">End Time</label>
              <input
                type="time"
                value={newEventEndTime}
                onChange={(e) => setNewEventEndTime(e.target.value)}
                step="300"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="recurring"
              checked={isRecurring}
              onChange={(e) => {
                setIsRecurring(e.target.checked)
                if (e.target.checked) {
                  setShowRecurrenceConfig(true)
                } else {
                  setShowRecurrenceConfig(false)
                  setRRuleString("")
                }
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-stone-300 rounded"
            />
            <label htmlFor="recurring" className="text-sm font-medium text-stone-700">
              Make this a recurring event
            </label>
          </div>

          {isRecurring && (
            <RecurrenceConfigComponent
              isOpen={showRecurrenceConfig}
              onToggle={() => setShowRecurrenceConfig(!showRecurrenceConfig)}
              config={recurrenceConfig}
              onChange={setRecurrenceConfig}
              onRRuleChange={setRRuleString}
              startDate={selectedDate || new Date().toISOString().split("T")[0]}
            />
          )}

          {isRecurring && rruleString && (
            <div className="p-3 bg-stone-50 rounded-md">
              <label className="block text-xs font-medium text-stone-600 mb-1">Generated RRule</label>
              <code className="text-xs text-stone-800 break-all">{rruleString}</code>
            </div>
          )}

          {/* Status Display - only show when editing */}
          {isEditing && event && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  event.status === "DONE" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {event.status}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-between p-4 border-t border-stone-200">
          {/* Delete button - only show when editing */}
          {isEditing && onDelete ? (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!newEventTitle.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-stone-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              <Save className="h-4 w-4" />
              {isEditing ? "Save Changes" : "Create Event"}
            </button>
          </div>
        </div>
      </div>

      <RecurrenceEditModal
        isOpen={showRecurrenceEditModal}
        onClose={handleRecurrenceEditCancel}
        onConfirm={handleRecurrenceEditConfirm}
        eventTitle={event?.title || newEventTitle}
        isDeleting={pendingAction === "delete"}
      />
    </>
  )
}
