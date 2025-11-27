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

  const getMoodLabel = (mood: number) => {
    if (mood > 0.5) return "Very Positive"
    if (mood > 0) return "Positive"
    if (mood > -0.5) return "Negative"
    return "Very Negative"
  }

  const getEnergyLabel = (energy: number) => {
    if (energy > 0.5) return "High Energy"
    if (energy > 0) return "Moderate"
    if (energy > -0.5) return "Low"
    return "Very Low"
  }

  const getClarityLabel = (clarity: number) => {
    if (clarity > 0.5) return "Very Focused"
    if (clarity > 0) return "Clear"
    if (clarity > -0.5) return "Uncertain"
    return "Confused"
  }

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

      {/* Semantic values */}
      {(entry.mood !== null || entry.energy !== null || entry.clarity !== null) && (
        <div className="border-t border-border/50 p-4">
          <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Semantic Position</h4>
          <div className="space-y-2">
            {entry.mood !== null && entry.mood !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Mood</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        entry.mood > 0 ? "bg-green-500" : "bg-red-500",
                      )}
                      style={{
                        width: `${Math.abs(entry.mood) * 50}%`,
                        marginLeft: entry.mood < 0 ? `${50 - Math.abs(entry.mood) * 50}%` : "50%",
                      }}
                    />
                  </div>
                  <span className="w-24 text-right text-xs text-muted-foreground">{getMoodLabel(entry.mood)}</span>
                </div>
              </div>
            )}
            {entry.energy !== null && entry.energy !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Energy</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-yellow-500 transition-all"
                      style={{ width: `${(entry.energy + 1) * 50}%` }}
                    />
                  </div>
                  <span className="w-24 text-right text-xs text-muted-foreground">{getEnergyLabel(entry.energy)}</span>
                </div>
              </div>
            )}
            {entry.clarity !== null && entry.clarity !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Clarity</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${(entry.clarity + 1) * 50}%` }}
                    />
                  </div>
                  <span className="w-24 text-right text-xs text-muted-foreground">
                    {getClarityLabel(entry.clarity)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
