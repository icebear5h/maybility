// Calendar types
export * from "./calendar-types"

// Journal types
export * from "./journal-types"

// Task types
export * from "./task-types"

// User types
export * from "./user-types"

// Common types that don't fit elsewhere
export interface ApiResponse<T> {
  data?: T
  error?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type SortDirection = "asc" | "desc"

export interface SortOption {
  field: string
  direction: SortDirection
}
