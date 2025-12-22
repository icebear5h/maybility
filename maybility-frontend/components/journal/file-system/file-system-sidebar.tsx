"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import { FolderTreeNode, type FolderNode } from "./folder-tree-node"
import { EntryListItem } from "./entry-list-item"
import type { JournalEntry, Folder } from "@/lib/types"

interface FileSystemSidebarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  folderTree: FolderNode[]
  rootEntries: JournalEntry[]
  filteredEntries: JournalEntry[] | null
  expandedFolders: Set<string>
  selectedEntry: JournalEntry | null
  onToggleFolder: (folderId: string) => void
  onSelectEntry: (entry: JournalEntry) => void
  onCreateEntry: () => void
  onCreateFolder: (parentId: string | null) => void
  onDeleteEntry: (entry: JournalEntry) => void
  onDeleteFolder: (folder: Folder) => void
  onRenameFolder: (folder: Folder) => void
}

export function FileSystemSidebar({
  searchQuery,
  onSearchChange,
  folderTree,
  rootEntries,
  filteredEntries,
  expandedFolders,
  selectedEntry,
  onToggleFolder,
  onSelectEntry,
  onCreateEntry,
  onCreateFolder,
  onDeleteEntry,
  onDeleteFolder,
  onRenameFolder,
}: FileSystemSidebarProps) {
  const renderEntry = (entry: JournalEntry, depth = 0) => (
    <EntryListItem
      key={entry.id}
      entry={entry}
      depth={depth}
      isSelected={selectedEntry?.id === entry.id}
      onSelect={onSelectEntry}
      onDelete={onDeleteEntry}
    />
  )

  return (
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
            onChange={(e) => onSearchChange(e.target.value)}
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
            {folderTree.map((node) => (
              <FolderTreeNode
                key={node.folder.id}
                node={node}
                depth={0}
                isExpanded={expandedFolders.has(node.folder.id)}
                onToggle={onToggleFolder}
                onCreateFolder={onCreateFolder}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
                renderEntry={renderEntry}
              />
            ))}
            {rootEntries.map((entry) => renderEntry(entry, 0))}
          </div>
        )}
      </div>
    </div>
  )
}
