import type { TaskStatus, Priority } from "./common"

// ============================================================================
// TASK - Todo items with completion tracking
// ============================================================================

export interface Task {
  id: string
  title: string
  description?: string | null
  status: TaskStatus
  priority: Priority
  color: string

  // Optional soft deadline (not a scheduled time)
  dueDate?: Date | string | null

  userId: string
  goalId?: string | null

  createdAt: Date | string
  updatedAt: Date | string
  completedAt?: Date | string | null
}
