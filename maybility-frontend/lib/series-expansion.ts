import { DateTime } from 'luxon'
import { RRuleSet, rrulestr } from 'rrule'
import type { Task, RecurringException, RecurringOverride } from '@prisma/client'
import type { Occurrence } from '@/types/calendar-types'
import { utcToTimezone } from '@/lib/timezone-utils'

/**
 * Expanded occurrence from a Task series
 */
export interface ExpandedOccurrence {
  id: string                    // Unique ID for this occurrence
  seriesId: string              // Task ID (series definition)
  occurrenceKey: string         // Unique key for this specific occurrence
  
  // Times (UTC)
  startUtc: string              // ISO string
  endUtc: string                // ISO string
  
  // Event timezone
  timezone: string              // IANA timezone
  
  // Source
  source: 'SINGLE' | 'RRULE' | 'OVERRIDE'
  
  // Display fields
  title: string
  description: string
  color: string
  status: string
  priority: string
  
  // Metadata
  isException: boolean
  hasOverride: boolean
  
  // Recurrence (for RRULE sources)
  rrule?: string                // RRule string
}

/**
 * Expands a single Task into occurrences within a time window
 * 
 * @param task - Task from database (series definition)
 * @param windowStartUtc - Window start (ISO string)
 * @param windowEndUtc - Window end (ISO string)
 * @param exceptions - Exceptions for this task
 * @param overrides - Overrides for this task
 * @returns Array of expanded occurrences
 */
export function expandTask(
  task: Task,
  windowStartUtc: string,
  windowEndUtc: string,
  exceptions: RecurringException[] = [],
  overrides: RecurringOverride[] = []
): ExpandedOccurrence[] {
  if (task.occurrenceType === 'SINGLE') {
    return expandSingleTask(task, windowStartUtc, windowEndUtc)
  } else {
    return expandRecurringTask(task, windowStartUtc, windowEndUtc, exceptions, overrides)
  }
}

/**
 * Expands a SINGLE task (non-recurring)
 * Single tasks don't need overrides - users just edit the task directly
 */
function expandSingleTask(
  task: Task,
  windowStartUtc: string,
  windowEndUtc: string
): ExpandedOccurrence[] {
  // Parse dates - handle both Date objects and ISO strings from JSON
  const startDate = task.startTime instanceof Date ? task.startTime : new Date(task.startTime)
  const endDate = task.endTime instanceof Date ? task.endTime : new Date(task.endTime)
  
  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error('[expandSingleTask] Invalid dates:', { 
      task, 
      startTime: task.startTime, 
      endTime: task.endTime,
      startDateValid: !isNaN(startDate.getTime()),
      endDateValid: !isNaN(endDate.getTime())
    })
    return []
  }
  
  // Convert to ISO strings for comparison (dates are already in UTC from DB)
  const startUtcISO = startDate.toISOString()
  const endUtcISO = endDate.toISOString()

  // Check if task falls within window
  if (startUtcISO >= windowEndUtc || endUtcISO <= windowStartUtc) {
    return [] // Outside window
  }
  
  return [{
    id: task.id,
    seriesId: task.id,
    occurrenceKey: task.id,
    startUtc: startUtcISO,
    endUtc: endUtcISO,
    timezone: task.timezone || 'UTC',
    source: 'SINGLE',
    title: task.title,
    description: task.description || '',
    color: task.color,
    status: task.status,
    priority: task.priority,
    isException: false,
    hasOverride: false,
    rrule: undefined,
  }]
}

/**
 * Expands a RRULE task (recurring)
 */
function expandRecurringTask(
  task: Task,
  windowStartUtc: string,
  windowEndUtc: string,
  exceptions: RecurringException[],
  overrides: RecurringOverride[]
): ExpandedOccurrence[] {
  if (!task.rrule || !task.timezone) {
    console.warn(`Task ${task.id} is RRULE but missing rrule or timezone`)
    return []
  }
  
  try {
    console.log('[expandRecurringTask] Task data:', {
      id: task.id,
      startTime: task.startTime,
      endTime: task.endTime,
      timezone: task.timezone,
      rrule: task.rrule,
      startTimeType: typeof task.startTime,
      endTimeType: typeof task.endTime
    })
    
    // Parse RRuleSet
    const rruleSet = rrulestr(task.rrule, { forceset: true }) as RRuleSet
    
    // Get seed in event timezone
    // Handle both Date objects and ISO strings (from JSON deserialization)
    const startTimeDate = task.startTime instanceof Date ? task.startTime : new Date(task.startTime)
    const endTimeDate = task.endTime instanceof Date ? task.endTime : new Date(task.endTime)
    
    const seedUtc = DateTime.fromJSDate(startTimeDate, { zone: 'utc' })
    const seedLocal = seedUtc.setZone(task.timezone)
    
    console.log('[expandRecurringTask] Seed times:', {
      seedUtc: seedUtc.toISO(),
      seedLocal: seedLocal.toISO(),
      seedUtcMillis: seedUtc.toMillis()
    })
    
    // Calculate duration from seed
    const endUtc = DateTime.fromJSDate(endTimeDate, { zone: 'utc' })
    const durationMs = endUtc.toMillis() - seedUtc.toMillis()
    
    
    // Convert window to event timezone for accurate selection
    const windowStartLocal = DateTime.fromISO(windowStartUtc, { zone: 'utc' })
      .setZone(task.timezone)
    const windowEndLocal = DateTime.fromISO(windowEndUtc, { zone: 'utc' })
      .setZone(task.timezone)
    
    // Generate occurrences in event timezone
    const localStarts = rruleSet.between(
      windowStartLocal.toJSDate(),
      windowEndLocal.toJSDate(),
      true // inclusive
    )
    
    // Build exception set (UTC timestamps)
    const exceptionSet = new Set(
      exceptions.map(e => DateTime.fromJSDate(e.originalStart, { zone: 'utc' }).toISO())
    )
    
    // Build override map: originalStart (UTC ISO) -> override
    // Overrides are per-occurrence, not per-event
    const overrideMap = new Map<string, RecurringOverride>()
    for (const override of overrides) {
      if (override.eventId === task.id) {
        const originalStartISO = DateTime.fromJSDate(override.originalStart, { zone: 'utc' }).toISO()
        if (originalStartISO) {
          overrideMap.set(originalStartISO, override)
        }
      }
    }
    
    // Expand each occurrence
    const occurrences: ExpandedOccurrence[] = []
    
    for (const localStartDate of localStarts) {
      // Convert local start to UTC
      const localStart = DateTime.fromJSDate(localStartDate, { zone: task.timezone })
      const occStartUtc = localStart.toUTC()
      const occStartUtcISO = occStartUtc.toISO()!
      
      // Check if this occurrence is excepted
      if (exceptionSet.has(occStartUtcISO)) {
        continue // Skip this occurrence
      }
      
      // Calculate end time
      const occEndUtc = occStartUtc.plus({ milliseconds: durationMs })
      
      // Generate occurrence key (unique ID for this occurrence)
      const occurrenceKey = `${task.id}-${localStart.toFormat('yyyy-LL-dd\'T\'HH:mm')}`
      
      // Check if this specific occurrence has an override
      const occurrenceOverride = overrideMap.get(occStartUtcISO)
      
      // Handle override times - only use override if it exists for this occurrence
      let finalStartUtc = occStartUtcISO
      let finalEndUtc = occEndUtc.toISO()!
      
      if (occurrenceOverride?.newStart) {
        const overrideStart = DateTime.fromJSDate(occurrenceOverride.newStart, { zone: 'utc' })
        if (overrideStart.isValid) {
          finalStartUtc = overrideStart.toISO()!
        }
      }
      
      if (occurrenceOverride?.newEnd) {
        const overrideEnd = DateTime.fromJSDate(occurrenceOverride.newEnd, { zone: 'utc' })
        if (overrideEnd.isValid) {
          finalEndUtc = overrideEnd.toISO()!
        }
      }
      
      occurrences.push({
        id: occurrenceKey,
        seriesId: task.id,
        occurrenceKey,
        startUtc: finalStartUtc,
        endUtc: finalEndUtc,
        timezone: task.timezone,
        source: occurrenceOverride ? 'OVERRIDE' : 'RRULE',
        title: occurrenceOverride?.title || task.title,
        description: occurrenceOverride?.description || task.description || '',
        color: task.color,
        status: occurrenceOverride?.status || task.status,
        priority: task.priority,
        isException: false,
        hasOverride: !!occurrenceOverride,
        rrule: task.rrule || undefined,
      })
    }
    
    return occurrences
  } catch (error) {
    console.error(`Error expanding recurring task ${task.id}:`, error)
    return []
  }
}

/**
 * Expands multiple tasks into occurrences within a time window
 * 
 * @param tasks - Array of tasks from database
 * @param windowStartUtc - Window start (ISO string)
 * @param windowEndUtc - Window end (ISO string)
 * @param exceptionsMap - Map of taskId -> exceptions
 * @param overridesMap - Map of taskId -> overrides
 * @returns Array of all expanded occurrences
 */
export function expandToOccurrences(
  tasks: Task[],
  windowStartUtc: string,
  windowEndUtc: string,
  exceptionsMap: Map<string, RecurringException[]> = new Map(),
  overridesMap: Map<string, RecurringOverride[]> = new Map()
): ExpandedOccurrence[] {
  const allOccurrences: ExpandedOccurrence[] = []
  
  for (const task of tasks) {
    const exceptions = exceptionsMap.get(task.id) || []
    const overrides = overridesMap.get(task.id) || []
    
    const occurrences = expandTask(
      task,
      windowStartUtc,
      windowEndUtc,
      exceptions,
      overrides
    )
    
    allOccurrences.push(...occurrences)
  }
  
  // Sort by start time (filter out any invalid occurrences)
  const validOccurrences = allOccurrences.filter(occ => occ.startUtc && occ.endUtc)
  validOccurrences.sort((a, b) => a.startUtc.localeCompare(b.startUtc))
  
  if (validOccurrences.length < allOccurrences.length) {
    console.warn('[expandToOccurrences] Filtered out invalid occurrences:', 
      allOccurrences.length - validOccurrences.length)
  }
  
  return validOccurrences
}

/**
 * Converts ExpandedOccurrence to display format in viewer's timezone
 * 
 * @param occurrence - Expanded occurrence
 * @param viewerTz - Viewer's timezone (IANA)
 * @returns Occurrence for display
 */
export function occurrenceToDisplay(
  occurrence: ExpandedOccurrence,
  viewerTz: string
): Occurrence {
  // Use timezone utils to convert UTC to viewer's timezone
  const displayStart = utcToTimezone(occurrence.startUtc, viewerTz)
  const displayEnd = utcToTimezone(occurrence.endUtc, viewerTz)
  
  if (!displayStart || !displayEnd) {
    console.error('[occurrenceToDisplay] Failed to convert to viewer timezone:', {
      occurrence,
      viewerTz
    })
    // Fallback to UTC if conversion fails
    const fallbackStart = DateTime.fromISO(occurrence.startUtc, { zone: 'utc' })
    const fallbackEnd = DateTime.fromISO(occurrence.endUtc, { zone: 'utc' })
    
    return {
      id: occurrence.id,
      seriesId: occurrence.seriesId,
      occurrenceKey: occurrence.occurrenceKey,
      date: fallbackStart.toJSDate(),
      startTime: fallbackStart.toFormat('HH:mm'),
      endTime: fallbackEnd.toFormat('HH:mm'),
      title: occurrence.title,
      description: occurrence.description,
      color: occurrence.color,
      status: occurrence.status as "TODO" | "IN_PROGRESS" | "DONE",
      priority: occurrence.priority,
      source: occurrence.source,
      timezone: occurrence.timezone,
      hasOverride: occurrence.hasOverride,
      isException: occurrence.isException,
      rrule: occurrence.rrule,
      taskId: occurrence.seriesId,
    }
  }
  
  return {
    id: occurrence.id,
    seriesId: occurrence.seriesId,
    occurrenceKey: occurrence.occurrenceKey,
    date: displayStart.toJSDate(),
    startTime: displayStart.toFormat('HH:mm'),
    endTime: displayEnd.toFormat('HH:mm'),
    title: occurrence.title,
    description: occurrence.description,
    color: occurrence.color,
    status: occurrence.status as "TODO" | "IN_PROGRESS" | "DONE",
    priority: occurrence.priority,
    source: occurrence.source,
    timezone: occurrence.timezone,
    hasOverride: occurrence.hasOverride,
    isException: occurrence.isException,
    rrule: occurrence.rrule,
    taskId: occurrence.seriesId, // Backward compatibility
  }
}

/**
 * Converts occurrence back to event timezone for editing
 * 
 * @param occurrence - Expanded occurrence
 * @returns Edit data in event's timezone
 */
export function occurrenceToEdit(occurrence: ExpandedOccurrence) {
  // Use timezone utils to convert UTC to event's timezone
  const eventStart = utcToTimezone(occurrence.startUtc, occurrence.timezone)
  const eventEnd = utcToTimezone(occurrence.endUtc, occurrence.timezone)
  
  if (!eventStart || !eventEnd) {
    console.error('[occurrenceToEdit] Failed to convert to event timezone:', occurrence)
    throw new Error('Failed to convert occurrence times to event timezone')
  }
  
  return {
    ...occurrence,
    // Edit times in event's timezone
    editDate: eventStart.toISODate(),
    editStartTime: eventStart.toFormat('HH:mm'),
    editEndTime: eventEnd.toFormat('HH:mm'),
    editTimezone: occurrence.timezone,
  }
}
