export interface JournalEntry {
  id: string
  title: string
  content: string
  createdAt: string | Date
  updatedAt: string | Date
  userId: string
  folderId?: string | null
  // Semantic coordinates for 3D space
  mood?: number | null // -1 (negative) to +1 (positive)
  energy?: number | null // -1 (low) to +1 (high)
  clarity?: number | null // -1 (confused) to +1 (focused)
  // Branching support
  parentEntryId?: string | null
  branchLabel?: string | null
  duration?: number // Duration in minutes
  endTime?: string | Date | null
  isAllDay?: boolean
  color?: string // Event color
  recurrence?: RecurrenceRule | null
  goalId?: string | null
  stageId?: string | null // Link entry to a specific stage
}

export interface Folder {
  id: string
  name: string
  description?: string | null
  parentId: string | null
  isRoot?: boolean
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface Node {
  id: string
  type: "folder" | "file"
  name: string
  description?: string | null
  content?: string
  parentIds: string[] // Polyhierarchy - multiple parents
  lateralLinks?: string[] // Related nodes
  createdAt: string | Date
  updatedAt: string | Date
  archivedAt?: string | Date | null // Soft delete
  // Semantic coordinates (for files)
  mood?: number | null
  energy?: number | null
  clarity?: number | null
}

export type ViewMode = "journal" | "time" | "goals"

export type CalendarViewMode = "month" | "week" | "day"

export type TimeSubMode = "calendar" | "timeline"

export type JournalSubMode = "files" | "space"

export type CastleSubMode = "castle" | "unsorted" | "archive"

export interface SemanticPosition {
  mood: number
  energy: number
  clarity: number
}

export interface Task {
  id: string
  title: string
  description?: string
  completed: boolean
  dueDate?: Date | string | null
  priority?: "low" | "medium" | "high"
  createdAt: Date | string
  goalId?: string | null
  stageId?: string | null // Link task to a specific stage
}

export interface Stage {
  id: string
  title: string
  description?: string
  order: number // Position in the plan sequence
  status: "pending" | "active" | "completed"
  scheduledStart?: Date | string | null
  scheduledEnd?: Date | string | null
}

export interface Goal {
  id: string
  title: string
  description?: string
  color: string
  icon?: string
  status: "not-started" | "in-progress" | "completed" | "paused"
  startDate: Date | string
  targetDate: Date | string
  category: "career" | "health" | "financial" | "personal" | "education" | "relationships"
  stages: Stage[]
  createdAt: Date | string
  updatedAt: Date | string
}

export interface BreadcrumbPath {
  nodes: Node[]
  isActive: boolean
}

export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly" | "yearly"
  interval: number // Every X days/weeks/months/years
  daysOfWeek?: number[] // 0 = Sunday, 1 = Monday, etc.
  endDate?: string | Date | null
  occurrences?: number | null // End after X occurrences
}
