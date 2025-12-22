import type { EventStatus, EventVisibility, OccurrenceType } from "./common"

// ============================================================================
// EVENT - Calendar events with time/location/attendees
// ============================================================================

export interface Event {
  id: string
  title: string
  description?: string | null
  location?: string | null
  url?: string | null // Video call link, etc.

  // Time fields (stored in UTC, converted for display)
  startTime: Date | string
  endTime: Date | string
  timezone: string // IANA timezone (e.g., "America/New_York")
  isAllDay: boolean

  // Event metadata
  status: EventStatus
  visibility: EventVisibility
  color?: string | null

  // Recurrence
  occurrenceType: OccurrenceType
  rrule?: string | null // RRule string for recurring events

  userId: string
  goalId?: string | null

  createdAt: Date | string
  updatedAt: Date | string
}

// ============================================================================
// EVENT RECURRENCE
// ============================================================================

export interface RecurringException {
  id: string
  eventId: string
  originalStart: Date | string // UTC timestamp of the occurrence being excepted
  isCancelled: boolean
}

export interface RecurringOverride {
  id: string
  eventId: string
  originalStart: Date | string // UTC timestamp of the occurrence being overridden

  // Overridden values (null = use original)
  newStart?: Date | string | null
  newEnd?: Date | string | null
  title?: string | null
  description?: string | null
  location?: string | null
  status?: EventStatus | null
}

// ============================================================================
// EVENT ATTENDEES & REMINDERS
// ============================================================================

export interface EventAttendee {
  id: string
  eventId: string
  email: string
  name?: string | null
  isOptional: boolean
  hasAccepted?: boolean | null
}

export interface Reminder {
  id: string
  eventId: string
  minutesBefore: number // e.g., 15 for 15 minutes before
  method: string // notification, email, etc.
}
