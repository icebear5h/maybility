import type { Task } from "@/types/task-types"
import type { Occurrence, ViewType } from "@/types/calendar-types"
import { getExpandedBounds } from "./calendar-bounds"

interface RecurrencePattern {
  pattern: "daily" | "weekly" | "monthly" | "custom"
  interval: number
  endDate?: string
  weeklyDays?: string[]
  monthlyType?: "byDate" | "byDay"
  customDays?: string[]
}

/**
 * Expand recurring events for a specific calendar view with appropriate bounds
 */
export function expandRecurringEventsForView(
  tasks: Task[],
  currentDate: Date,
  view: ViewType
): Occurrence[] {
  const { startDate, endDate } = getExpandedBounds(currentDate, view)
  const allOccurrences: Occurrence[] = []

  // Get max instances based on view to prevent performance issues
  const maxInstances = getMaxInstancesForView(view)

  for (const task of tasks) {
    if (task.rrule && task.scheduledDate) {
      const occurrences = expandRecurringEvent(task, startDate, endDate, maxInstances)
      allOccurrences.push(...occurrences)
    }
  }

  return allOccurrences.sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime())
}

/**
 * Get appropriate max instances based on view to prevent performance issues
 */
function getMaxInstancesForView(view: ViewType): number {
  switch (view) {
    case "day":
      return 50 // Day view with buffer: ~3 weeks max
    case "week":
      return 200 // Week view with buffer: ~5 weeks max
    case "month":
    default:
      return 500 // Month view with buffer: ~3 months max
  }
}

export function expandRecurringEvent(
  task: Task,
  startDate: Date,
  endDate: Date,
  maxInstances: number = 100
): Occurrence[] {
  if (!task.rrule || !task.scheduledDate) {
    return []
  }

  const instances: Occurrence[] = []
  const baseDate = new Date(task.scheduledDate)
  
  // Parse recurrence data from task
  const recurrence = parseRecurrenceFromTask(task)
  if (!recurrence) return []

  let currentDate = new Date(baseDate)
  let instanceCount = 0

  // Start from the base date, but only include instances within our range
  while (
    currentDate <= endDate &&
    instanceCount < maxInstances &&
    (!recurrence.endDate || currentDate <= new Date(recurrence.endDate))
  ) {
    // Only include instances within our requested range
    if (currentDate >= startDate) {
      instances.push(createOccurrenceFromTask(task, currentDate))
    }

    // Get next occurrence
    const nextDate = getNextOccurrence(currentDate, recurrence)
    
    // Prevent infinite loops
    if (nextDate <= currentDate) {
      console.warn('RRULE expansion detected infinite loop, breaking')
      break
    }
    
    currentDate = nextDate
    instanceCount++
  }

  return instances
}

function parseRecurrenceFromTask(task: Task): RecurrencePattern | null {
  if (!task.rrule) return null

  try {
    // Enhanced RRULE parsing
    const parts = task.rrule.toUpperCase().split(';')
    const freq = parts.find(p => p.startsWith('FREQ='))?.split('=')[1]
    const interval = parseInt(parts.find(p => p.startsWith('INTERVAL='))?.split('=')[1] || '1')
    const until = parts.find(p => p.startsWith('UNTIL='))?.split('=')[1]
    const byDay = parts.find(p => p.startsWith('BYDAY='))?.split('=')[1]
    const count = parts.find(p => p.startsWith('COUNT='))?.split('=')[1]

    if (!freq) {
      console.warn('Invalid RRULE: missing FREQ', task.rrule)
      return null
    }

    let pattern: "daily" | "weekly" | "monthly" | "custom" = "daily"
    switch (freq) {
      case 'DAILY':
        pattern = "daily"
        break
      case 'WEEKLY':
        pattern = "weekly"
        break
      case 'MONTHLY':
        pattern = "monthly"
        break
      default:
        console.warn('Unsupported FREQ:', freq)
        return null
    }

    let weeklyDays: string[] = []
    if (byDay && pattern === "weekly") {
      const dayMap: { [key: string]: string } = {
        "MO": "Monday", "TU": "Tuesday", "WE": "Wednesday",
        "TH": "Thursday", "FR": "Friday", "SA": "Saturday", "SU": "Sunday"
      }
      weeklyDays = byDay.split(',').map(day => dayMap[day.trim()]).filter(Boolean)
    }

    // Handle end date from UNTIL or COUNT
    let endDate: string | undefined
    if (until) {
      // Parse UNTIL date (format: YYYYMMDDTHHMMSSZ or YYYYMMDD)
      const untilStr = until.replace(/[TZ]/g, '').substring(0, 8)
      const year = parseInt(untilStr.substring(0, 4))
      const month = parseInt(untilStr.substring(4, 6)) - 1 // JS months are 0-based
      const day = parseInt(untilStr.substring(6, 8))
      endDate = new Date(year, month, day).toISOString().split('T')[0]
    } else if (count) {
      // Calculate end date based on count (approximate)
      const countNum = parseInt(count)
      const baseDate = new Date(task.scheduledDate!)
      let estimatedEndDate = new Date(baseDate)
      
      switch (pattern) {
        case "daily":
          estimatedEndDate.setDate(baseDate.getDate() + (countNum * interval))
          break
        case "weekly":
          estimatedEndDate.setDate(baseDate.getDate() + (countNum * interval * 7))
          break
        case "monthly":
          estimatedEndDate.setMonth(baseDate.getMonth() + (countNum * interval))
          break
      }
      
      endDate = estimatedEndDate.toISOString().split('T')[0]
    }

    return {
      pattern,
      interval: Math.max(1, interval), // Ensure interval is at least 1
      endDate,
      weeklyDays,
      monthlyType: "byDate",
      customDays: []
    }
  } catch (error) {
    console.error('Error parsing RRULE:', error, 'for task:', task.id)
    return null
  }
}

function getNextOccurrence(currentDate: Date, recurrence: RecurrencePattern): Date {
  const nextDate = new Date(currentDate)

  switch (recurrence.pattern) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + recurrence.interval)
      break

    case "weekly":
      if (recurrence.weeklyDays && recurrence.weeklyDays.length > 0) {
        // Find next occurrence based on selected days
        let daysToAdd = 1
        let foundNext = false
        
        // Look for next selected day within the current week
        while (daysToAdd <= 7 && !foundNext) {
          const testDate = new Date(currentDate)
          testDate.setDate(testDate.getDate() + daysToAdd)
          
          if (isDaySelected(testDate, recurrence.weeklyDays)) {
            nextDate.setDate(currentDate.getDate() + daysToAdd)
            foundNext = true
          } else {
            daysToAdd++
          }
        }
        
        // If no day found in current interval, move to next interval
        if (!foundNext) {
          nextDate.setDate(nextDate.getDate() + (7 * recurrence.interval))
          // Find first selected day in the new interval
          while (!isDaySelected(nextDate, recurrence.weeklyDays)) {
            nextDate.setDate(nextDate.getDate() + 1)
            // Safety check to prevent infinite loop
            if (nextDate.getTime() - currentDate.getTime() > 14 * 24 * 60 * 60 * 1000) {
              break
            }
          }
        }
      } else {
        // No specific days selected, repeat weekly
        nextDate.setDate(nextDate.getDate() + (7 * recurrence.interval))
      }
      break

    case "monthly":
      if (recurrence.monthlyType === "byDate") {
        const originalDay = currentDate.getDate()
        nextDate.setMonth(nextDate.getMonth() + recurrence.interval)
        
        // Handle month-end dates (e.g., Jan 31 -> Feb 28)
        if (nextDate.getDate() !== originalDay) {
          nextDate.setDate(0) // Go to last day of previous month
        }
      } else {
        // byDay logic would be more complex - for now, default to byDate
        nextDate.setMonth(nextDate.getMonth() + recurrence.interval)
      }
      break

    case "custom":
      // Custom logic for specific days
      nextDate.setDate(nextDate.getDate() + 1)
      let attempts = 0
      while (!isDaySelected(nextDate, recurrence.customDays || []) && attempts < 365) {
        nextDate.setDate(nextDate.getDate() + 1)
        attempts++
      }
      break
  }

  return nextDate
}

function isDaySelected(date: Date, selectedDays: string[]): boolean {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const dayName = dayNames[date.getDay()]
  return selectedDays.includes(dayName)
}

function createOccurrenceFromTask(task: Task, occurrenceDate: Date): Occurrence {
  const startDateTime = new Date(occurrenceDate)
  const endDateTime = new Date(occurrenceDate)

  // Set times if available
  if (task.startTime) {
    const [hours, minutes] = task.startTime.split(':').map(Number)
    startDateTime.setHours(hours, minutes, 0, 0)
  } else {
    // Default to 9 AM if no start time
    startDateTime.setHours(9, 0, 0, 0)
  }

  if (task.endTime) {
    const [hours, minutes] = task.endTime.split(':').map(Number)
    endDateTime.setHours(hours, minutes, 0, 0)
  } else if (task.estimatedDuration) {
    // Use estimated duration
    endDateTime.setTime(startDateTime.getTime() + task.estimatedDuration * 60 * 1000)
  } else {
    // Default to 1 hour duration
    endDateTime.setTime(startDateTime.getTime() + 60 * 60 * 1000)
  }

  return {
    id: `${task.id}:${occurrenceDate.toISOString().split('T')[0]}`,
    taskId: task.id,
    title: task.title,
    description: task.description || "",
    startUtc: startDateTime.toISOString(),
    endUtc: endDateTime.toISOString(),
    color: task.color || "#3b82f6",
    status: task.status,
    source: "RRULE" as const,
    isRecurring: true,
    hasOverride: false,
  }
}

// Helper to create RRULE string from form data
export function createRRuleFromFormData(formData: {
  recurrencePattern: string
  recurrenceInterval: number
  recurrenceEnd?: string
  recurrenceCount?: number
  weeklyDays?: string[]
  monthlyType?: string
}): string {
  let rrule = ""

  switch (formData.recurrencePattern) {
    case "daily":
      rrule = `FREQ=DAILY;INTERVAL=${formData.recurrenceInterval}`
      break
    case "weekly":
      rrule = `FREQ=WEEKLY;INTERVAL=${formData.recurrenceInterval}`
      if (formData.weeklyDays && formData.weeklyDays.length > 0) {
        const dayMap: { [key: string]: string } = {
          "Monday": "MO", "Tuesday": "TU", "Wednesday": "WE",
          "Thursday": "TH", "Friday": "FR", "Saturday": "SA", "Sunday": "SU"
        }
        const byDay = formData.weeklyDays.map(day => dayMap[day]).join(',')
        rrule += `;BYDAY=${byDay}`
      }
      break
    case "monthly":
      rrule = `FREQ=MONTHLY;INTERVAL=${formData.recurrenceInterval}`
      break
  }

  // Add end condition
  if (formData.recurrenceEnd) {
    const endDate = new Date(formData.recurrenceEnd)
    rrule += `;UNTIL=${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
  } else if (formData.recurrenceCount) {
    rrule += `;COUNT=${formData.recurrenceCount}`
  }

  return rrule
}
