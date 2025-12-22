// Re-export all types from domain modules

export * from "./common"
export * from "./calendar"
export * from "./journal"
export * from "./tasks"
export * from "./goals"

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

// TODO: Remove this once all components are migrated to use Event type
// For now, JournalEntry is aliased to a hybrid type for backwards compatibility
import type { Entry } from "./journal"
import type { RecurrenceRule } from "./common"

export interface JournalEntry extends Entry {
  // Calendar event fields (temporary for migration)
  duration?: number // Duration in minutes
  endTime?: string | Date | null
  isAllDay?: boolean
  color?: string
  recurrence?: RecurrenceRule | null
  stageId?: string | null
}
