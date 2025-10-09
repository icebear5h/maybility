export type ViewType = "month" | "week" | "day"

export interface Occurrence {
  id: string
  taskId?: string
  goalId: string
  title: string
  description?: string
  date: Date
  startTime: string
  endTime: string
  color: string
  status: "TODO" | "IN_PROGRESS" | "DONE"
  occurrenceType: "SINGLE" | "RRULE" | "UNSCHEDULED"
  hasOverride: boolean
  rrule?: string
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
