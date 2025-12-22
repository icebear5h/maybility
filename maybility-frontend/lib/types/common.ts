// ============================================================================
// ENUMS - Aligned with Prisma schema
// ============================================================================

export enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  DONE = "DONE",
}

export enum EventStatus {
  TENTATIVE = "TENTATIVE",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
}

export enum EventVisibility {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
  CONFIDENTIAL = "CONFIDENTIAL",
}

export enum OccurrenceType {
  SINGLE = "SINGLE",
  RECURRING = "RECURRING",
}

export enum CalendarType {
  GOOGLE = "GOOGLE",
  INTERNAL = "INTERNAL",
}

export enum UpdateKind {
  TASK_COMPLETION = "TASK_COMPLETION",
  REFLECTION = "REFLECTION",
  MILESTONE = "MILESTONE",
  EVENT_NOTE = "EVENT_NOTE",
}

// ============================================================================
// VIEW MODES
// ============================================================================

export type ViewMode = "journal" | "time" | "goals"

export type CalendarViewMode = "month" | "week" | "day"

export type TimeSubMode = "calendar" | "timeline"

export type JournalSubMode = "files" | "space"

export type CastleSubMode = "ideas" | "journal" | "unsorted" | "archive"

// Journal node types for the canvas
export type JournalNodeType = "daily" | "weekly" | "monthly"

// ============================================================================
// RECURRENCE
// ============================================================================

export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly" | "yearly"
  interval: number // Every X days/weeks/months/years
  daysOfWeek?: number[] // 0 = Sunday, 1 = Monday, etc.
  endDate?: string | Date | null
  occurrences?: number | null // End after X occurrences
}

// ============================================================================
// SEMANTIC POSITIONING
// ============================================================================

export interface SemanticPosition {
  mood: number // -1 (negative) to +1 (positive)
  energy: number // -1 (low) to +1 (high)
  clarity: number // -1 (confused) to +1 (focused)
}
