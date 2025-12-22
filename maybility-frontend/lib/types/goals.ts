// ============================================================================
// GOAL - High-level objectives
// ============================================================================

export interface Goal {
  id: string
  title: string
  description?: string | null
  targetDate?: Date | string | null
  definitionOfDone?: string | null
  color?: string | null
  archived: boolean
  userId: string
  createdAt: Date | string
  updatedAt: Date | string
}

// ============================================================================
// STAGE - Sub-goals or milestones within a goal
// ============================================================================

export interface Stage {
  id: string
  title: string
  description?: string | null
  targetDate?: Date | string | null
  color?: string | null
  userId: string
  goalId: string
  createdAt: Date | string
  updatedAt: Date | string
}
