export interface JournalEntry {
  id: string
  title: string
  content: string
  createdAt: string | Date
  updatedAt: string | Date
  userId: string
  folderId?: string | null
  // Branching support
  parentEntryId?: string | null
  branchLabel?: string | null
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
  path?: string // File system path (for Electron integration)
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

export type ViewMode = "journal" | "time" | "goals" | "settings"

export type CalendarViewMode = "month" | "week" | "day"

export type TimeSubMode = "calendar" | "timeline" | "now"

export type JournalSubMode = "files" | "space"

export type CastleSubMode = "ideas" | "journal" | "unsorted" | "archive"

export interface SemanticPosition {
  mood: number
  energy: number
  clarity: number
}

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE"
export type Priority = "LOW" | "MEDIUM" | "HIGH"
export type EventStatus = "TENTATIVE" | "CONFIRMED" | "CANCELLED"
export type EventVisibility = "PUBLIC" | "PRIVATE" | "CONFIDENTIAL"
export type OccurrenceType = "SINGLE" | "RECURRING"

// Unified Event model - handles both scheduled events and unscheduled tasks
export interface Event {
  id: string
  title: string
  description?: string | null
  location?: string | null
  url?: string | null

  // Time fields (optional for unscheduled tasks)
  startTime?: Date | string | null
  endTime?: Date | string | null
  timezone?: string | null
  isAllDay: boolean

  // Soft deadline for unscheduled tasks
  dueDate?: Date | string | null

  // Task fields (optional for pure calendar events)
  taskStatus?: TaskStatus | null
  priority: Priority
  completedAt?: Date | string | null

  // Event metadata
  eventStatus: EventStatus
  visibility: EventVisibility
  color: string

  // Recurrence
  occurrenceType: OccurrenceType
  rrule?: string | null

  // Optional link to local journal entry
  entryPath?: string | null

  userId: string
  goalId?: string | null
  stageId?: string | null

  createdAt: Date | string
  updatedAt: Date | string
}

// Legacy Task type alias for backward compatibility
export type Task = Event

export interface Stage {
  id: string
  title: string
  description?: string | null
  targetDate?: Date | string | null
  color?: string | null
  order: number // Fractional ordering for easy insertion
  entryPaths?: string[] | null // Array of relative paths to journal entries
  userId: string
  goalId: string
  createdAt: Date | string
  updatedAt: Date | string
  events?: Event[]
}

export interface Goal {
  id: string
  title: string
  description?: string | null
  targetDate?: Date | string | null
  definitionOfDone?: string | null
  color?: string | null
  archived: boolean
  entryPaths?: string[] | null // Array of relative paths to journal entries
  userId: string
  createdAt: Date | string
  updatedAt: Date | string
  stages?: Stage[]
  events?: Event[]
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

// Icon positioning for desktop-style file system view
export interface IconPosition {
  x: number
  y: number
}

export interface IconPositions {
  [itemId: string]: IconPosition
}

// ============================================================================
// USER SETTINGS
// ============================================================================

export interface UserSettings {
  id: string
  userId: string

  // Agent
  fastModel: string
  reasoningModel: string
  routerThreshold: number
  enableComplexPath: boolean

  // Custom prompts
  customRouterPrompt: string | null
  customSimplePrompt: string | null
  customOrchestratorPrompt: string | null
  customSynthesizerPrompt: string | null
  customSetTasksPrompt: string | null

  // General
  timezone: string

  // Theme
  themePreset: string
  accentHue: number
  accentChroma: number

  createdAt: Date | string
  updatedAt: Date | string
}

export interface ModelOption {
  id: string
  label: string
}

export const AVAILABLE_MODELS = {
  fast: [
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Fast)" },
    { id: "llama-3.1-70b-versatile", label: "Llama 3.1 70B" },
    { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
  ] as ModelOption[],
  reasoning: [
    { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
    { id: "llama-3.1-70b-versatile", label: "Llama 3.1 70B" },
  ] as ModelOption[],
} as const

export interface ThemePreset {
  name: string
  label: string
  background: string
  primary: string
}

export const THEME_PRESETS: ThemePreset[] = [
  { name: "dark", label: "Dark", background: "oklch(0.13 0.02 260)", primary: "oklch(0.7 0.15 200)" },
  { name: "midnight", label: "Midnight", background: "oklch(0.08 0.02 260)", primary: "oklch(0.65 0.18 240)" },
  { name: "ocean", label: "Ocean", background: "oklch(0.12 0.03 220)", primary: "oklch(0.7 0.18 200)" },
  { name: "forest", label: "Forest", background: "oklch(0.12 0.02 140)", primary: "oklch(0.65 0.15 145)" },
  { name: "sunset", label: "Sunset", background: "oklch(0.13 0.02 30)", primary: "oklch(0.7 0.18 25)" },
]
