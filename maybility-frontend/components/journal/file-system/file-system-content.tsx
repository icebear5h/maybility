"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FolderIcon, FolderOpen, FileText, Plus, FolderPlus, MoreHorizontal, Trash2, Edit, RotateCcw } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import type { Folder, JournalEntry, IconPosition } from "@/lib/types"
import { useIconPositions } from "@/lib/hooks/useIconPositions"

interface FolderContents {
  folders: Folder[]
  entries: JournalEntry[]
}

interface FileSystemContentProps {
  currentFolderId: string | null
  currentFolderContents: FolderContents
  folders: Folder[]
  entries: JournalEntry[]
  selectedEntry: JournalEntry | null
  onNavigateToFolder: (folderId: string | null) => void
  onSelectEntry: (entry: JournalEntry) => void
  onCreateFolder: (parentId: string | null) => void
  onCreateEntry: () => void
  onDeleteFolder: (folder: Folder) => void
  onDeleteEntry: (entry: JournalEntry) => void
  onRenameFolder: (folder: Folder) => void
}

interface DragState {
  itemId: string
  startX: number
  startY: number
  offsetX: number
  offsetY: number
}

const ICON_SIZE = 100

export function FileSystemContent({
  currentFolderId,
  currentFolderContents,
  folders,
  entries,
  selectedEntry,
  onNavigateToFolder,
  onSelectEntry,
  onCreateFolder,
  onCreateEntry,
  onDeleteFolder,
  onDeleteEntry,
  onRenameFolder,
}: FileSystemContentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [dragPosition, setDragPosition] = useState<IconPosition | null>(null)

  const { getPosition, setPosition, clearPositions } = useIconPositions(currentFolderId, containerWidth)

  // Track container width for auto-positioning
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, itemId: string, currentPos: IconPosition) => {
      if (e.button !== 0) return // Only left click
      e.preventDefault()

      const rect = (e.target as HTMLElement).closest('[data-icon]')?.getBoundingClientRect()
      if (!rect) return

      setDragState({
        itemId,
        startX: currentPos.x,
        startY: currentPos.y,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      })
      setDragPosition(currentPos)
    },
    []
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const newX = Math.max(0, Math.min(
        e.clientX - containerRect.left - dragState.offsetX,
        containerRect.width - ICON_SIZE
      ))
      const newY = Math.max(0, e.clientY - containerRect.top - dragState.offsetY)

      setDragPosition({ x: newX, y: newY })
    },
    [dragState]
  )

  const handleMouseUp = useCallback(() => {
    if (dragState && dragPosition) {
      setPosition(dragState.itemId, dragPosition)
    }
    setDragState(null)
    setDragPosition(null)
  }, [dragState, dragPosition, setPosition])

  // Combine folders and entries for unified indexing
  const allItems = [
    ...currentFolderContents.folders.map((f) => ({ type: "folder" as const, item: f })),
    ...currentFolderContents.entries.map((e) => ({ type: "entry" as const, item: e })),
  ]

  const renderFolderIcon = (folder: Folder, index: number) => {
    const itemId = `folder-${folder.id}`
    const savedPos = getPosition(itemId, index)
    const pos = dragState?.itemId === itemId && dragPosition ? dragPosition : savedPos
    const isDragging = dragState?.itemId === itemId

    return (
      <div
        key={folder.id}
        data-icon
        style={{
          position: "absolute",
          left: pos.x,
          top: pos.y,
          width: ICON_SIZE,
          zIndex: isDragging ? 1000 : 1,
        }}
        className={cn(
          "group flex flex-col items-center p-2 rounded-lg cursor-pointer select-none transition-shadow",
          isDragging ? "shadow-lg ring-2 ring-primary/50" : "hover:bg-muted/50"
        )}
        onMouseDown={(e) => handleMouseDown(e, itemId, savedPos)}
        onDoubleClick={() => !isDragging && onNavigateToFolder(folder.id)}
      >
        <div className="relative">
          <FolderIcon className="h-12 w-12 text-primary" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute -right-2 -top-2 h-6 w-6 opacity-0 group-hover:opacity-100 bg-background/80"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onNavigateToFolder(folder.id)}>
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
        <p className="mt-1 text-xs font-medium text-center truncate w-full">
          {folder.isRoot ? "All Entries" : folder.name}
        </p>
        <p className="text-[10px] text-muted-foreground text-center">
          {folders.filter((f) => f.parentId === folder.id).length +
            entries.filter((e) => e.folderId === folder.id).length}{" "}
          items
        </p>
      </div>
    )
  }

  const renderEntryIcon = (entry: JournalEntry, index: number) => {
    const itemId = `entry-${entry.id}`
    const savedPos = getPosition(itemId, index)
    const pos = dragState?.itemId === itemId && dragPosition ? dragPosition : savedPos
    const isDragging = dragState?.itemId === itemId
    const isSelected = selectedEntry?.id === entry.id

    return (
      <div
        key={entry.id}
        data-icon
        style={{
          position: "absolute",
          left: pos.x,
          top: pos.y,
          width: ICON_SIZE,
          zIndex: isDragging ? 1000 : isSelected ? 2 : 1,
        }}
        className={cn(
          "group flex flex-col items-center p-2 rounded-lg cursor-pointer select-none transition-shadow",
          isDragging && "shadow-lg ring-2 ring-primary/50",
          isSelected && !isDragging && "bg-primary/10 ring-1 ring-primary",
          !isDragging && !isSelected && "hover:bg-muted/50"
        )}
        onMouseDown={(e) => handleMouseDown(e, itemId, savedPos)}
        onClick={() => !isDragging && onSelectEntry(entry)}
      >
        <div className="relative">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute -right-2 -top-2 h-6 w-6 opacity-0 group-hover:opacity-100 bg-background/80"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
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
        <p className="mt-1 text-xs font-medium text-center truncate w-full">{entry.title}</p>
        <p className="text-[10px] text-muted-foreground text-center">
          {format(new Date(entry.createdAt), "MMM d")}
        </p>
      </div>
    )
  }

  // Calculate min height based on icon positions
  const minHeight = Math.max(
    400,
    ...allItems.map((item, index) => {
      const itemId = item.type === "folder" ? `folder-${item.item.id}` : `entry-${item.item.id}`
      const pos = getPosition(itemId, index)
      return pos.y + ICON_SIZE + 50
    })
  )

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto"
      onMouseMove={dragState ? handleMouseMove : undefined}
      onMouseUp={dragState ? handleMouseUp : undefined}
      onMouseLeave={dragState ? handleMouseUp : undefined}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">
            {currentFolderId ? folders.find((f) => f.id === currentFolderId)?.name || "Folder" : "All Files"}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent"
              onClick={clearPositions}
              title="Reset icon positions"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Layout
            </Button>
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

        {allItems.length === 0 ? (
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
          <div
            className="relative border border-dashed border-border/50 rounded-lg"
            style={{ minHeight }}
          >
            {currentFolderContents.folders.map((folder, i) =>
              renderFolderIcon(folder, i)
            )}
            {currentFolderContents.entries.map((entry, i) =>
              renderEntryIcon(entry, currentFolderContents.folders.length + i)
            )}
          </div>
        )}
      </div>
    </div>
  )
}
