"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  FolderIcon,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Edit,
  FolderPlus,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Folder, JournalEntry } from "@/lib/types"

export interface FolderNode {
  folder: Folder
  children: FolderNode[]
  entries: JournalEntry[]
}

interface FolderTreeNodeProps {
  node: FolderNode
  depth: number
  isExpanded: boolean
  onToggle: (folderId: string) => void
  onCreateFolder: (parentId: string) => void
  onRenameFolder: (folder: Folder) => void
  onDeleteFolder: (folder: Folder) => void
  renderEntry: (entry: JournalEntry, depth: number) => React.ReactNode
}

export function FolderTreeNode({
  node,
  depth,
  isExpanded,
  onToggle,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  renderEntry,
}: FolderTreeNodeProps) {
  const hasChildren = node.children.length > 0 || node.entries.length > 0

  return (
    <div>
      <div
        className={cn("group flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer")}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <button onClick={() => hasChildren && onToggle(node.folder.id)} className="shrink-0 p-0.5">
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
          {node.children.map((child) => (
            <FolderTreeNode
              key={child.folder.id}
              node={child}
              depth={depth + 1}
              isExpanded={isExpanded}
              onToggle={onToggle}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              renderEntry={renderEntry}
            />
          ))}
          {node.entries.map((entry) => renderEntry(entry, depth + 1))}
        </div>
      )}
    </div>
  )
}
