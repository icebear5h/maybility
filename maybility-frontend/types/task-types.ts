
import { TaskStatus, Priority, OccurrenceType, RecurringOverride, RecurringException } from "@prisma/client"

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  color: string
  userId: string
  goalId?: string
  createdAt: Date
  updatedAt: Date
  timezone?: string
  occurrenceType: OccurrenceType

  // Core UTC date range (the actual day(s) this task/event applies to)
  startDate: Date
  endDate?: Date

  // Time-only fields (24h format, UTC)
  startTime: string     // "HH:MM"
  endTime: string       // "HH:MM"

  // Recurrence rule (RFC 5545 format)
  rrule?: string        // e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR"

  exceptions?: RecurringException[]
  overrides?: RecurringOverride[]
}

export interface ToDo {
  id: string,
  
}