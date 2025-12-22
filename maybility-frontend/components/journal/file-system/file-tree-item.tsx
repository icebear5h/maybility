"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  FolderIcon,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Edit,
  FilePlus,
  FolderPlus,
} from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Node } from "@/lib/types"

interface FileTreeItemProps {
  node: Node
  depth: number
  children: Node[]
  isSelected: boolean
  isExpanded: boolean
  onToggle: (nodeId: string) => void
  onSelect: (node: Node) => void
  onCreateFile: (parentId: string) => void
  onCreateFolder: (parentId: string) => void
  onRename: (node: Node) => void
  onDelete: (node: Node) => void
}

export function FileTreeItem({
  node,
  depth,
  children,
  isSelected,
  isExpanded,
  onToggle,
  onSelect,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
}: FileTreeItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isFolder = node.type === 'folder'
  const hasChildren = children.length > 0

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>
          <div
            className={cn(
              "group flex items-center gap-1 rounded-sm px-2 py-1 cursor-pointer transition-colors text-sm",
              isSelected && "bg-primary/10 text-primary",
              !isSelected && "hover:bg-muted/50"
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => onSelect(node)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (isFolder && hasChildren) onToggle(node.id)
              }}
              className="shrink-0 p-0.5"
            >
              {isFolder && hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )
              ) : (
                <span className="w-3.5" />
              )}
            </button>

            {isFolder ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 shrink-0 text-blue-500" />
              ) : (
                <FolderIcon className="h-4 w-4 shrink-0 text-blue-500" />
              )
            ) : (
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}

            <span className="flex-1 truncate">{node.name}</span>

            {(isHovered || isSelected) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isFolder && (
                    <>
                      <DropdownMenuItem onClick={() => onCreateFile(node.id)}>
                        <FilePlus className="mr-2 h-4 w-4" />
                        New File
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCreateFolder(node.id)}>
                        <FolderPlus className="mr-2 h-4 w-4" />
                        New Folder
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => onRename(node)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(node)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isFolder && isExpanded && children.length > 0 && (
            <div>
              {children.map((child) => (
                <FileTreeItem
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  children={[]} // Will be passed down from parent
                  isSelected={isSelected}
                  isExpanded={isExpanded}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  onCreateFile={onCreateFile}
                  onCreateFolder={onCreateFolder}
                  onRename={onRename}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {isFolder && (
          <>
            <ContextMenuItem onClick={() => onCreateFile(node.id)}>
              <FilePlus className="mr-2 h-4 w-4" />
              New File
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onCreateFolder(node.id)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              New Folder
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem onClick={() => onRename(node)}>
          <Edit className="mr-2 h-4 w-4" />
          Rename
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onDelete(node)} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
