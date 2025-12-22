"use client"

import { cn } from "@/lib/utils"
import { Folder, FileText, Archive, Inbox, Plus, Calendar, BookOpen, Brain, Lightbulb } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { CastleSubMode } from "@/lib/types"

interface CastleHeaderProps {
  subMode: CastleSubMode
  onSubModeChange: (mode: CastleSubMode) => void
  unsortedCount: number
  archivedCount: number
  onCreateNode: (type: "folder" | "file", parentId: string | null) => void
  onCreateJournal?: (type: "daily" | "weekly" | "monthly") => void
  currentFolderId: string | null
}

export function CastleHeader({
  subMode,
  onSubModeChange,
  unsortedCount,
  archivedCount,
  onCreateNode,
  onCreateJournal,
  currentFolderId,
}: CastleHeaderProps) {
  const isIdeasView = subMode === "ideas" || subMode === "unsorted" || subMode === "archive"
  const isJournalView = subMode === "journal"

  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
      <div className="flex items-center gap-3">
        {/* Primary view toggle: Ideas vs Journal */}
        <div className="flex items-center gap-1 bg-zinc-900/80 backdrop-blur-sm rounded-lg p-1 border border-zinc-800 pointer-events-auto">
          <button
            onClick={() => onSubModeChange("ideas")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
              isIdeasView
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800",
            )}
          >
            <Lightbulb className="h-3.5 w-3.5" />
            Ideas
          </button>
          <button
            onClick={() => onSubModeChange("journal")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
              isJournalView
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800",
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Journal
          </button>
        </div>

        {/* Secondary filters for Ideas view */}
        {isIdeasView && (
          <div className="flex items-center gap-1 bg-zinc-900/60 backdrop-blur-sm rounded-lg p-1 border border-zinc-800/50 pointer-events-auto">
            <button
              onClick={() => onSubModeChange("ideas")}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded transition-all",
                subMode === "ideas"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50",
              )}
            >
              All
            </button>
            <button
              onClick={() => onSubModeChange("unsorted")}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded transition-all flex items-center gap-1",
                subMode === "unsorted"
                  ? "bg-amber-900/50 text-amber-300"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50",
              )}
            >
              <Inbox className="h-3 w-3" />
              Unsorted
              {unsortedCount > 0 && (
                <span className="px-1 py-0.5 text-[9px] bg-amber-500/30 text-amber-300 rounded-full">
                  {unsortedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onSubModeChange("archive")}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded transition-all flex items-center gap-1",
                subMode === "archive"
                  ? "bg-zinc-700 text-zinc-300"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50",
              )}
            >
              <Archive className="h-3 w-3" />
              Archive
            </button>
          </div>
        )}
      </div>

      {/* New button - context-aware */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 bg-zinc-900/80 backdrop-blur-sm border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 pointer-events-auto"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            New
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
          {isIdeasView && (
            <>
              <DropdownMenuItem
                onClick={() => onCreateNode("folder", currentFolderId)}
                className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
              >
                <Folder className="h-4 w-4 mr-2 text-indigo-400" />
                New Folder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onCreateNode("file", currentFolderId)}
                className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
              >
                <FileText className="h-4 w-4 mr-2 text-zinc-500" />
                New Idea
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
            </>
          )}
          <DropdownMenuItem
            onClick={() => onCreateJournal?.("daily")}
            className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
          >
            <Calendar className="h-4 w-4 mr-2 text-emerald-500" />
            Daily Journal
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onCreateJournal?.("weekly")}
            className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
          >
            <BookOpen className="h-4 w-4 mr-2 text-blue-500" />
            Weekly Reflection
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onCreateJournal?.("monthly")}
            className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
          >
            <BookOpen className="h-4 w-4 mr-2 text-purple-500" />
            Monthly Review
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
