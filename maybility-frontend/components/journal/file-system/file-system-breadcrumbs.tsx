"use client"

import { cn } from "@/lib/utils"
import { Home, ChevronRight } from "lucide-react"
import type { Folder, JournalEntry } from "@/lib/types"

interface FileSystemBreadcrumbsProps {
  currentFolderId: string | null
  breadcrumbPath: Folder[]
  selectedEntry: JournalEntry | null
  onNavigate: (folderId: string | null) => void
}

export function FileSystemBreadcrumbs({
  currentFolderId,
  breadcrumbPath,
  selectedEntry,
  onNavigate,
}: FileSystemBreadcrumbsProps) {
  return (
    <div className="border-b border-border/50 bg-card/30 px-4 py-2">
      <div className="flex items-center gap-1 text-sm">
        <button
          onClick={() => onNavigate(null)}
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
              onClick={() => onNavigate(folder.id)}
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
  )
}
