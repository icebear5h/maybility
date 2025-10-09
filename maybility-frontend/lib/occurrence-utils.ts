import type { Occurrence } from "@/types/calendar-types"
import type { Task } from "@prisma/client"


/**
 * Converts Occurrence updates to Task updates for API calls
 * Maps frontend Occurrence fields to backend Task fields
 */
export function occurrenceToTaskUpdate(occurrence: Partial<Occurrence>): Partial<Task> {
  const taskUpdate: Partial<Task> = {}

  // Map title and description directly
  if (occurrence.title !== undefined) taskUpdate.title = occurrence.title
  if (occurrence.description !== undefined) taskUpdate.description = occurrence.description

  // Map date to scheduledDate (startDate)
  if (occurrence.date) {
    const dateObj = occurrence.date instanceof Date ? occurrence.date : new Date(occurrence.date)
    taskUpdate.startDate = dateObj
  }

  // Map time fields directly
  if (occurrence.startTime !== undefined) taskUpdate.startTime = occurrence.startTime
  if (occurrence.endTime !== undefined) taskUpdate.endTime = occurrence.endTime

  // Map status
  if (occurrence.status !== undefined) taskUpdate.status = occurrence.status

  // Map recurrence fields
  if (occurrence.rrule !== undefined) taskUpdate.rrule = occurrence.rrule
  if (occurrence.occurrenceType !== undefined) taskUpdate.occurrenceType = occurrence.occurrenceType

  return taskUpdate
}

/**
 * Converts a Task to an Occurrence for frontend display
 * Generates a unique frontend ID
 */
export function taskToOccurrence(task: Task, occurrenceDate?: Date): Occurrence {
  const date = occurrenceDate || task.startDate || new Date()
  const frontendId = `${task.id}-${date.toISOString()}`

  return {
    id: frontendId,
    taskId: task.id,
    goalId: task.goalId || "",
    title: task.title,
    description: task.description || "",
    date: date,
    startTime: task.startTime || "09:00",
    endTime: task.endTime || "10:00",
    color: task.color,
    status: task.status,
    occurrenceType: task.rrule ? "RRULE" : "SINGLE",
    hasOverride: false,
    rrule: task.rrule || undefined,
  }
}
