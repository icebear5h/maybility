export type ViewType = "month" | "week" | "day"

/**
 * Frontend interface for displaying occurrences
 * This is what the UI components work with
 */
export interface Occurrence {
  id: string                    // Unique ID for this occurrence
  seriesId: string              // Task ID (series definition)
  occurrenceKey: string         // Unique key for this specific occurrence
  
  // Display data (in viewer's timezone)
  date: Date                    // Display date
  startTime: string             // Display start time (HH:MM)
  endTime: string               // Display end time (HH:MM)
  
  // Event data
  title: string
  description: string
  color: string
  status: "TODO" | "IN_PROGRESS" | "DONE"
  priority: string
  
  // Metadata
  source: 'SINGLE' | 'RRULE' | 'OVERRIDE'
  timezone: string              // Event's timezone
  hasOverride: boolean
  isException: boolean
  
  // Recurrence (for RRULE and OVERRIDE sources)
  rrule?: string                // RRule string for recurring events
  
  // Optional fields
  goalId?: string
  
  // Backward compatibility (deprecated - use seriesId)
  taskId?: string
}

/**
 * Frontend interface for creating/editing events
 * This is what the event modal works with
 */
export interface EventFormData {
  title: string
  description: string
  date: string                  // ISO date (YYYY-MM-DD)
  startTime: string             // HH:MM
  endTime: string               // HH:MM
  timezone: string              // IANA timezone
  color?: string
  status?: "TODO" | "IN_PROGRESS" | "DONE"
  priority?: string
  
  // Recurrence (optional)
  isRecurring?: boolean
  rruleConfig?: RecurrenceConfig
}

export interface DragState {
  eventId?: string
  newDate?: string
  originalDate?: string
  type?: "move" | "resize-start" | "resize-end"

}

export interface RecurrenceConfig {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
  interval: number
  count?: number
  until?: string
  byweekday?: number[]
  bymonthday?: number[]
  bymonth?: number[]
}

export type RecurrenceEditType = "this" | "following" | "all"

export interface RecurrenceException {
  id: string
  eventId: string
  originalStart: string // ISO string
  isCancelled: boolean
}

export interface RecurrenceOverride {
  id: string
  eventId: string
  originalStart: string // ISO string
  newStart?: string
  newEnd?: string
  title?: string
  description?: string
  status?: "TODO" | "IN_PROGRESS" | "DONE"
}
