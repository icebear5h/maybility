"use client"

import type { JournalEntry } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { X, Edit, GitBranch, Calendar, Trash2 } from "lucide-react"
import { format } from "date-fns"

interface EntryDetailPanelProps {
  entry: JournalEntry | null
  onClose: () => void
  onEdit?: (entry: JournalEntry) => void
  onDelete?: (entry: JournalEntry) => void
}

export function EntryDetailPanel({ entry, onClose, onEdit, onDelete }: EntryDetailPanelProps) {
  if (!entry) return null
  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-40 w-96 rounded-xl border border-border bg-card shadow-xl transition-all duration-300",
        entry ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border/50 p-4">
        <div className="flex-1 pr-2">
          <h3 className="font-semibold">{entry.title}</h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(entry.createdAt), "MMMM d, yyyy 'at' h:mm a")}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content preview */}
      <div className="max-h-40 overflow-auto p-4">
        <p className="text-sm leading-relaxed text-foreground/90">{entry.content || "No content"}</p>
      </div>
      {/* Branch info */}
      {entry.branchLabel && (
        <div className="border-t border-border/50 p-4">
          <div className="flex items-center gap-2 text-sm text-accent">
            <GitBranch className="h-4 w-4" />
            <span>{entry.branchLabel}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 border-t border-border/50 p-4">
        <Button variant="outline" size="sm" className="flex-1 gap-2 bg-transparent" onClick={() => onEdit?.(entry)}>
          <Edit className="h-4 w-4" />
          Edit
        </Button>
        <Button variant="outline" size="sm" className="flex-1 gap-2 bg-transparent">
          <GitBranch className="h-4 w-4" />
          Branch
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete?.(entry)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
