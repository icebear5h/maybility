import type { Occurrence, EventFormData } from "@/types/calendar-types"
import type { Task } from "@prisma/client"
import { DateTime } from 'luxon'

/**
 * Converts Occurrence to EventFormData for editing
 * Extracts date/time in the event's timezone
 */
export function occurrenceToFormData(occurrence: Occurrence): EventFormData {
  // Convert UTC times back to event timezone
  const startUtc = DateTime.fromJSDate(occurrence.date, { zone: 'utc' })
  const eventStart = startUtc.setZone(occurrence.timezone)
  
  return {
    title: occurrence.title,
    description: occurrence.description,
    date: eventStart.toISODate()!,
    startTime: occurrence.startTime,
    endTime: occurrence.endTime,
    timezone: occurrence.timezone,
    color: occurrence.color,
    status: occurrence.status,
    priority: occurrence.priority,
  }
}

/**
 * Converts EventFormData to API request format
 * This is what gets sent to POST/PATCH endpoints
 */
export function formDataToTaskUpdate(formData: EventFormData) {
  return {
    title: formData.title,
    description: formData.description,
    date: formData.date,
    startTime: formData.startTime,
    endTime: formData.endTime,
    timezone: formData.timezone,
    color: formData.color,
    status: formData.status,
    priority: formData.priority,
    isRecurring: formData.isRecurring,
    rrule: formData.isRecurring ? buildRRule(formData.rruleConfig) : undefined,
  }
}

/**
 * Converts Occurrence updates to API request format
 * Maps frontend Occurrence fields to API fields
 * 
 * @deprecated Use formDataToTaskUpdate instead for new code
 */
export function occurrenceToTaskUpdate(occurrence: Partial<Occurrence>): any {
  console.log("[occurrenceToTaskUpdate] Input occurrence:", occurrence)
  
  const apiUpdate: any = {}

  // Map title and description directly
  if (occurrence.title !== undefined) apiUpdate.title = occurrence.title
  if (occurrence.description !== undefined) apiUpdate.description = occurrence.description

  // Map date - convert Date to YYYY-MM-DD string
  if (occurrence.date) {
    const dateObj = occurrence.date instanceof Date ? occurrence.date : new Date(occurrence.date)
    apiUpdate.date = dateObj.toISOString().split('T')[0]
  }

  // Map time fields directly
  if (occurrence.startTime !== undefined) apiUpdate.startTime = occurrence.startTime
  if (occurrence.endTime !== undefined) apiUpdate.endTime = occurrence.endTime

  // Map timezone
  if (occurrence.timezone !== undefined) apiUpdate.timezone = occurrence.timezone

  // Map status
  if (occurrence.status !== undefined) apiUpdate.status = occurrence.status

  // Map color and priority
  if (occurrence.color !== undefined) apiUpdate.color = occurrence.color
  if (occurrence.priority !== undefined) apiUpdate.priority = occurrence.priority

  // Map recurrence fields (CRITICAL!)
  console.log("[occurrenceToTaskUpdate] Checking rrule:", {
    hasRrule: 'rrule' in occurrence,
    rruleValue: occurrence.rrule,
    rruleType: typeof occurrence.rrule
  })
  
  if (occurrence.rrule !== undefined) {
    apiUpdate.rrule = occurrence.rrule
    // If rrule is provided, set occurrenceType
    apiUpdate.occurrenceType = occurrence.rrule ? 'RRULE' : 'SINGLE'
  }

  console.log("[occurrenceToTaskUpdate] Output apiUpdate:", apiUpdate)
  return apiUpdate
}

/**
 * Builds RRule string from RecurrenceConfig
 * TODO: Implement full RRule builder
 */
function buildRRule(config: any): string | undefined {
  if (!config) return undefined
  
  // Simple implementation - expand this later
  const parts = [`FREQ=${config.frequency}`]
  if (config.interval) parts.push(`INTERVAL=${config.interval}`)
  if (config.count) parts.push(`COUNT=${config.count}`)
  if (config.until) parts.push(`UNTIL=${config.until}`)
  
  return parts.join(';')
}
