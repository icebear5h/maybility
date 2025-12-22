import type { SemanticPosition } from "./common"

// ============================================================================
// JOURNAL ENTRY - Text-based journal entries
// ============================================================================

export interface Entry {
  id: string
  title: string
  content: string
  folderId: string
  userId: string
  goalId?: string | null
  createdAt: Date | string
  updatedAt: Date | string

  // Semantic coordinates for 3D space
  mood?: number | null // -1 (negative) to +1 (positive)
  energy?: number | null // -1 (low) to +1 (high)
  clarity?: number | null // -1 (confused) to +1 (focused)
}

// ============================================================================
// FOLDER - Hierarchical organization
// ============================================================================

export interface Folder {
  id: string
  name: string
  parentId?: string | null
  userId: string
  goalId?: string | null
  createdAt: Date | string
  updatedAt: Date | string
  isRoot: boolean
}

// ============================================================================
// NODE - Polyhierarchical file system (for Castle view)
// ============================================================================

export interface Node {
  id: string
  type: "folder" | "file"
  name: string
  description?: string | null
  content?: string
  parentIds: string[] // Polyhierarchy - multiple parents
  lateralLinks?: string[] // Related nodes
  createdAt: Date | string
  updatedAt: Date | string
  archivedAt?: Date | string | null // Soft delete

  // Semantic coordinates (for files)
  mood?: number | null
  energy?: number | null
  clarity?: number | null
}

// ============================================================================
// BREADCRUMB
// ============================================================================

export interface BreadcrumbPath {
  nodes: Node[]
  isActive: boolean
}
