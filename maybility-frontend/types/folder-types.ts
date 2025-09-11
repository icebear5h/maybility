// types/folder-types.ts
import type { JournalEntry } from "./journal-types"

export type RootToken = "root"
export type FolderId = string
export type FolderRef = RootToken | FolderId | null

export interface Folder {
  id: string
  name: string
  parentId: string | null
  userId: string
  projectId?: string | null
  isRoot: boolean
  createdAt: string
  updatedAt: string
}

export interface FoldersGetResponse {
  folder: Folder | null              // current folder (or null if you model root-as-null)
  folders: Folder[]                  // child folders
  entries: JournalEntry[]            // entries under current folder
  breadcrumbs?: Array<Pick<Folder, "id" | "name">>
}

export interface CreateFolderBody {
  parentId: FolderRef
  name?: string
}

export interface UpdateFolderBody {
  name?: string
  parentId?: FolderRef
}

export const isRootId = (id: FolderRef): id is RootToken => id === "root"
