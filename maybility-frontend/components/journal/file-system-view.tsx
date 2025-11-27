"use client"

import { useState, useMemo } from "react"
import type { JournalEntry, Folder } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  FolderIcon,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  FolderPlus,
  Home,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"

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

interface FolderNode {
  folder: Folder
  children: FolderNode[]
  entries: JournalEntry[]
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

  const renderFolderNode = (node: FolderNode, depth = 0) => {
    const isExpanded = expandedFolders.has(node.folder.id)
    const hasChildren = node.children.length > 0 || node.entries.length > 0

    return (
      <div key={node.folder.id}>
        <div
          className={cn("group flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer")}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <button onClick={() => hasChildren && toggleFolder(node.folder.id)} className="shrink-0 p-0.5">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <span className="w-4" />
            )}
          </button>

          {isExpanded ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <FolderIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}

          <span className="flex-1 truncate text-sm">{node.folder.isRoot ? "All Entries" : node.folder.name}</span>

          <span className="mr-1 text-xs text-muted-foreground">{node.entries.length}</span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCreateFolder(node.folder.id)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </DropdownMenuItem>
              {!node.folder.isRoot && (
                <>
                  <DropdownMenuItem onClick={() => onRenameFolder(node.folder)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDeleteFolder(node.folder)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isExpanded && (
          <div>
            {node.children.map((child) => renderFolderNode(child, depth + 1))}
            {node.entries.map((entry) => renderEntry(entry, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const renderEntry = (entry: JournalEntry, depth = 0) => {
    const isSelected = selectedEntry?.id === entry.id

    return (
      <div
        key={entry.id}
        onClick={() => onSelectEntry(entry)}
        className={cn(
          "group flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors",
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50",
        )}
        style={{ paddingLeft: `${depth * 12 + 28}px` }}
      >
        <FileText className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm">{entry.title}</p>
          <p className="truncate text-xs text-muted-foreground">{format(new Date(entry.createdAt), "MMM d, yyyy")}</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSelectEntry(entry)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDeleteEntry(entry)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  const renderFolderItem = (folder: Folder) => {
    return (
      <div
        key={folder.id}
        onDoubleClick={() => navigateToFolder(folder.id)}
        className="group flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 p-3 cursor-pointer hover:bg-muted/50 hover:border-border transition-colors"
      >
        <FolderIcon className="h-8 w-8 shrink-0 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{folder.isRoot ? "All Entries" : folder.name}</p>
          <p className="text-xs text-muted-foreground">
            {folders.filter((f) => f.parentId === folder.id).length} folders,{" "}
            {entries.filter((e) => e.folderId === folder.id).length} entries
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigateToFolder(folder.id)}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateFolder(folder.id)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              New Folder
            </DropdownMenuItem>
            {!folder.isRoot && (
              <>
                <DropdownMenuItem onClick={() => onRenameFolder(folder)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDeleteFolder(folder)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  const renderEntryItem = (entry: JournalEntry) => {
    const isSelected = selectedEntry?.id === entry.id

    return (
      <div
        key={entry.id}
        onClick={() => onSelectEntry(entry)}
        className={cn(
          "group flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
          isSelected
            ? "border-primary bg-primary/10"
            : "border-border/50 bg-card/50 hover:bg-muted/50 hover:border-border",
        )}
      >
        <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{entry.title}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(entry.createdAt), "MMM d, yyyy")}</p>
        </div>
        {entry.mood !== null && entry.mood !== undefined && (
          <div
            className={cn(
              "h-2 w-2 rounded-full shrink-0",
              entry.mood > 0 ? "bg-green-500" : entry.mood < 0 ? "bg-red-500" : "bg-yellow-500",
            )}
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSelectEntry(entry)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDeleteEntry(entry)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/50 bg-card/30 px-4 py-2">
        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={() => navigateToFolder(null)}
            className={cn(
              "flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-muted/50",
              !currentFolderId && "text-primary",
            )}
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </button>

          {breadcrumbPath.map((folder, index) => (
            <div key={folder.id} className="flex items-center">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <button
                onClick={() => navigateToFolder(folder.id)}
                className={cn(
                  "rounded px-2 py-1 transition-colors hover:bg-muted/50",
                  index === breadcrumbPath.length - 1 && "text-primary font-medium",
                )}
              >
                {folder.isRoot ? "All Entries" : folder.name}
              </button>
            </div>
          ))}

          {selectedEntry && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-primary font-medium px-2 py-1 truncate max-w-[200px]">{selectedEntry.title}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r border-border/50 bg-card/30 flex flex-col">
          <div className="p-3 border-b border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-medium flex-1">Files</h2>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCreateEntry}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 bg-muted/50 border-0"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-2">
            {filteredEntries ? (
              <div className="space-y-1">
                <p className="px-2 py-1 text-xs text-muted-foreground">
                  {filteredEntries.length} result{filteredEntries.length !== 1 ? "s" : ""}
                </p>
                {filteredEntries.map((entry) => renderEntry(entry, 0))}
              </div>
            ) : (
              <div className="space-y-1">
                {folderTree.map((node) => renderFolderNode(node, 0))}
                {rootEntries.map((entry) => renderEntry(entry, 0))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-6 overflow-auto">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">
                {currentFolderId ? folders.find((f) => f.id === currentFolderId)?.name || "Folder" : "All Files"}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-transparent"
                  onClick={() => onCreateFolder(currentFolderId)}
                >
                  <FolderPlus className="h-4 w-4" />
                  New Folder
                </Button>
                <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={onCreateEntry}>
                  <Plus className="h-4 w-4" />
                  New Entry
                </Button>
              </div>
            </div>

            {currentFolderContents.folders.length === 0 && currentFolderContents.entries.length === 0 ? (
              <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">This folder is empty</p>
                  <div className="flex gap-2 justify-center mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-transparent"
                      onClick={() => onCreateFolder(currentFolderId)}
                    >
                      <FolderPlus className="h-4 w-4" />
                      New Folder
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={onCreateEntry}>
                      <Plus className="h-4 w-4" />
                      New Entry
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {currentFolderContents.folders.map((folder) => renderFolderItem(folder))}
                {currentFolderContents.entries.map((entry) => renderEntryItem(entry))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
