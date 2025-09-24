export type { TaskStatus, Priority, Update, UpdateKind } from "@prisma/client"

export interface Task {
    id: string
    title: string
    description?: string
    status: "TODO" | "IN_PROGRESS" | "DONE"
    priority: "LOW" | "MEDIUM" | "HIGH"
    color: string
    userId: string
    goalId?: string
    createdAt: string
    updatedAt: string
    timezone?: string
    occurrenceType: "SINGLE" | "RRULE" | "UNSCHEDULED"
    dtstart?: string
    startTime?: string
    endTime?: string
    rrule?: string
    endDate?: string
    scheduledDate?: string
    estimatedDuration?: number
    dueDate?: string
  }
  