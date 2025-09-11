import { useState, useEffect } from "react"
import { X, Trash2, Save } from "lucide-react"
import type { Occurrence } from "@//types/calendar-types"

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate?: string | null
  selectedTime?: string | null
  event?: Occurrence | null
  onCreate?: (eventData: {
    title: string
    description: string
    startTime: string
    endTime: string
    date: string
  }) => void
  onUpdate?: (eventId: string, updates: Partial<Occurrence>) => void
  onDelete?: (eventId: string) => void
}

export function EventModal({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  event,
  onCreate,
  onUpdate,
  onDelete,
}: EventModalProps) {
  const isEditing = !!event
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startTime: "09:00",
    endTime: "10:00",
    isRecurring: false,
    recurrencePattern: "daily" as "daily" | "weekly" | "monthly" | "custom",
    recurrenceInterval: 1,
    recurrenceEnd: "",
    weeklyDays: [] as string[], // For weekly: which days of week
    monthlyType: "byDate" as "byDate" | "byDay", // For monthly: by date (15th) or by day (2nd Tuesday)
    customDays: [] as string[], // For custom: specific days of week
  })

  // Initialize form data when event changes or modal opens
  useEffect(() => {
    if (isEditing && event) {
      const startDate = new Date(event.startUtc)
      const endDate = new Date(event.endUtc)
      
      // Ensure valid dates with fallbacks
      const validStartDate = !isNaN(startDate.getTime()) ? startDate : new Date()
      const validEndDate = !isNaN(endDate.getTime()) ? endDate : new Date(validStartDate.getTime() + 60 * 60 * 1000) // +1 hour
      
      setFormData({
        title: event.title,
        description: event.description || "",
        startTime: validStartDate.toTimeString().slice(0, 5),
        endTime: validEndDate.toTimeString().slice(0, 5),
        isRecurring: event.isRecurring || false,
        recurrencePattern: "daily",
        recurrenceInterval: 1,
        recurrenceEnd: "",
        weeklyDays: [],
        monthlyType: "byDate",
        customDays: [],
      })
    } else if (!isEditing) {
      // Creating new event - robust defaults
      const today = new Date()
      const defaultDate = selectedDate || today.toISOString().split('T')[0]
      
      // Parse selectedTime or use defaults
      let defaultStartTime = "09:00"
      let defaultEndTime = "10:00"
      
      if (selectedTime && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(selectedTime)) {
        defaultStartTime = selectedTime
        // Calculate end time (1 hour later)
        const [hours, minutes] = selectedTime.split(':').map(Number)
        const endHours = hours + 1
        const endMinutes = minutes
        
        if (endHours < 24) {
          defaultEndTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
        } else {
          defaultEndTime = "23:59"
        }
      }
      
      setFormData({
        title: "",
        description: "",
        startTime: selectedTime || "09:00",
        endTime: getEndTime(selectedTime || "09:00"),
        isRecurring: false,
        recurrencePattern: "daily",
        recurrenceInterval: 1,
        recurrenceEnd: "",
        weeklyDays: [],
        monthlyType: "byDate",
        customDays: [],
      })
    }
  }, [event, selectedDate, selectedTime, isEditing])

  if (!isOpen) return null

  const handleInputChange = (field: string, value: string | boolean | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    // Validate required fields with defaults
    const title = formData.title.trim() || "Untitled Event"
    const startDate = selectedDate || new Date().toISOString().split('T')[0]
    const startTime = formData.startTime || "09:00"
    const endTime = formData.endTime || "10:00"
    
    // Validate time format and fix if needed
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    const validStartTime = timeRegex.test(startTime) ? startTime : "09:00"
    const validEndTime = timeRegex.test(endTime) ? endTime : "10:00"
    
    // Ensure end time is after start time
    const startMinutes = parseInt(validStartTime.split(':')[0]) * 60 + parseInt(validStartTime.split(':')[1])
    const endMinutes = parseInt(validEndTime.split(':')[0]) * 60 + parseInt(validEndTime.split(':')[1])
    
    let finalEndTime = validEndTime
    if (endMinutes <= startMinutes) {
      // Add 1 hour to start time
      const newEndMinutes = startMinutes + 60
      const newEndHours = Math.floor(newEndMinutes / 60)
      const newEndMins = newEndMinutes % 60
      
      if (newEndHours < 24) {
        finalEndTime = `${newEndHours.toString().padStart(2, '0')}:${newEndMins.toString().padStart(2, '0')}`
      } else {
        finalEndTime = "23:59"
      }
    }

    if (isEditing && event && onUpdate) {
      // Editing existing event
      const startDateTime = new Date(`${startDate}T${validStartTime}:00`)
      const endDateTime = new Date(`${startDate}T${finalEndTime}:00`)

      const updates: Partial<Occurrence> = {
        title: title,
        description: formData.description || "",
        startUtc: startDateTime.toISOString(),
        endUtc: endDateTime.toISOString(),
        isRecurring: formData.isRecurring,
      }

      onUpdate(event.id, updates)
    } else if (!isEditing && onCreate) {
      // Creating new event
      onCreate({
        title: title,
        description: formData.description || "",
        startTime: validStartTime,
        endTime: finalEndTime,
        date: startDate,
      })
    }
    
    onClose()
  }

  const handleDelete = () => {
    if (isEditing && event && onDelete) {
      onDelete(event.id)
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[1000]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-[1001] w-[500px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h3 className="text-lg font-semibold text-stone-900">
            {isEditing ? "Edit Event" : "Create Event"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-stone-100 rounded transition-colors"
          >
            <X className="h-5 w-5 text-stone-500" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Event title"
              autoFocus={!isEditing}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Event description (optional)"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={selectedDate || ""}
              onChange={(e) => handleInputChange("date", e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => handleInputChange("startTime", e.target.value)}
                step="300"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => handleInputChange("endTime", e.target.value)}
                step="300"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Repetition */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <input
                type="checkbox"
                id="recurring"
                checked={formData.isRecurring}
                onChange={(e) => handleInputChange("isRecurring", e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-stone-300 rounded"
              />
              <label htmlFor="recurring" className="text-sm font-medium text-stone-700">
                Repeat this event
              </label>
            </div>

            {formData.isRecurring && (
              <div className="space-y-3 pl-6 border-l-2 border-stone-200">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Repeat every
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={formData.recurrenceInterval}
                        onChange={(e) => handleInputChange("recurrenceInterval", parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      />
                      <select
                        value={formData.recurrencePattern}
                        onChange={(e) => handleInputChange("recurrencePattern", e.target.value)}
                        className="flex-1 px-3 py-1 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="daily">day(s)</option>
                        <option value="weekly">week(s)</option>
                        <option value="monthly">month(s)</option>
                        <option value="custom">custom</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      End date (optional)
                    </label>
                    <input
                      type="date"
                      value={formData.recurrenceEnd}
                      onChange={(e) => handleInputChange("recurrenceEnd", e.target.value)}
                      className="w-full px-3 py-1 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                {formData.recurrencePattern === "weekly" && (
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Days of week
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                        <div key={day} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={day}
                            checked={formData.weeklyDays.includes(day)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleInputChange("weeklyDays", [...formData.weeklyDays, day])
                              } else {
                                handleInputChange("weeklyDays", formData.weeklyDays.filter((d) => d !== day))
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-stone-300 rounded"
                          />
                          <label htmlFor={day} className="text-sm font-medium text-stone-700">
                            {day}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {formData.recurrencePattern === "monthly" && (
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Monthly pattern
                    </label>
                    <select
                      value={formData.monthlyType}
                      onChange={(e) => handleInputChange("monthlyType", e.target.value)}
                      className="w-full px-3 py-1 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="byDate">by date (15th)</option>
                      <option value="byDay">by day (2nd Tuesday)</option>
                    </select>
                  </div>
                )}
                {formData.recurrencePattern === "custom" && (
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Custom days
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                        <div key={day} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={day}
                            checked={formData.customDays.includes(day)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleInputChange("customDays", [...formData.customDays, day])
                              } else {
                                handleInputChange("customDays", formData.customDays.filter((d) => d !== day))
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-stone-300 rounded"
                          />
                          <label htmlFor={day} className="text-sm font-medium text-stone-700">
                            {day}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status Display - only show when editing */}
          {isEditing && event && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Status
              </label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                event.status === 'DONE' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
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
              disabled={!formData.title.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-stone-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              <Save className="h-4 w-4" />
              {isEditing ? "Save Changes" : "Create Event"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function getEndTime(startTime: string) {
  const [hours, minutes] = startTime.split(':').map(Number)
  const endHours = hours + 1
  const endMinutes = minutes
  
  if (endHours < 24) {
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
  } else {
    return "23:59"
  }
}
