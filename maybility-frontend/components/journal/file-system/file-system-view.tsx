"use client"

import { useState, useMemo } from "react"
import type { JournalEntry, Folder } from "@/lib/types"
import { FileSystemSidebar } from "./file-system-sidebar"
import { FileSystemBreadcrumbs } from "./file-system-breadcrumbs"
import { FileSystemContent } from "./file-system-content"
import type { FolderNode } from "./folder-tree-node"

interface FileSystemViewProps {
  entries: JournalEntry[]
  folders: Folder[]
  onSelectEntry: (entry: JournalEntry | null) => void
  onCreateEntry: () => void
  onCreateFolder: (parentId: string | null) => void
  onDeleteEntry: (entry: JournalEntry) => void
  onDeleteFolder: (folder: Folder) => void
  onRenameFolder: (folder: Folder) => void
  selectedEntry: JournalEntry | null
}

export function FileSystemView({
  entries,
  folders,
  onSelectEntry,
  onCreateEntry,
  onCreateFolder,
  onDeleteEntry,
  onDeleteFolder,
  onRenameFolder,
  selectedEntry,
}: FileSystemViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["root"]))
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)

  const folderTree = useMemo(() => {
    const rootFolders = folders.filter((f) => f.isRoot || !f.parentId)
    const childFolders = folders.filter((f) => !f.isRoot && f.parentId)

    const buildNode = (folder: Folder): FolderNode => {
      const children = childFolders.filter((f) => f.parentId === folder.id).map((f) => buildNode(f))
      const folderEntries = entries.filter((e) => e.folderId === folder.id)
      return { folder, children, entries: folderEntries }
    }

    return rootFolders.map((f) => buildNode(f))
  }, [folders, entries])

  const breadcrumbPath = useMemo(() => {
    if (!currentFolderId) return []

    const path: Folder[] = []
    let current = folders.find((f) => f.id === currentFolderId)

    while (current) {
      path.unshift(current)
      current = current.parentId ? folders.find((f) => f.id === current!.parentId) : undefined
    }

    return path
  }, [currentFolderId, folders])

  const currentFolderContents = useMemo(() => {
    if (!currentFolderId) {
      const rootFoldersList = folders.filter((f) => f.isRoot || !f.parentId)
      const rootEntriesList = entries.filter((e) => !e.folderId)
      return { folders: rootFoldersList, entries: rootEntriesList }
    }

    const childFoldersList = folders.filter((f) => f.parentId === currentFolderId)
    const folderEntries = entries.filter((e) => e.folderId === currentFolderId)
    return { folders: childFoldersList, entries: folderEntries }
  }, [currentFolderId, folders, entries])

  const rootEntries = useMemo(() => {
    return entries.filter((e) => !e.folderId)
  }, [entries])

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return null
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.content?.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [entries, searchQuery])

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId)
    onSelectEntry(null)
  }

  return (
    <div className="flex h-full flex-col">
      <FileSystemBreadcrumbs
        currentFolderId={currentFolderId}
        breadcrumbPath={breadcrumbPath}
        selectedEntry={selectedEntry}
        onNavigate={navigateToFolder}
      />

      <div className="flex flex-1 overflow-hidden">
        <FileSystemSidebar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          folderTree={folderTree}
          rootEntries={rootEntries}
          filteredEntries={filteredEntries}
          expandedFolders={expandedFolders}
          selectedEntry={selectedEntry}
          onToggleFolder={toggleFolder}
          onSelectEntry={onSelectEntry}
          onCreateEntry={onCreateEntry}
          onCreateFolder={onCreateFolder}
          onDeleteEntry={onDeleteEntry}
          onDeleteFolder={onDeleteFolder}
          onRenameFolder={onRenameFolder}
        />

        <FileSystemContent
          currentFolderId={currentFolderId}
          currentFolderContents={currentFolderContents}
          folders={folders}
          entries={entries}
          selectedEntry={selectedEntry}
          onNavigateToFolder={navigateToFolder}
          onSelectEntry={onSelectEntry}
          onCreateFolder={onCreateFolder}
          onCreateEntry={onCreateEntry}
          onDeleteFolder={onDeleteFolder}
          onDeleteEntry={onDeleteEntry}
          onRenameFolder={onRenameFolder}
        />
      </div>
    </div>
  )
}
