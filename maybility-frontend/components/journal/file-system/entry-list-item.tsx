"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FileText, MoreHorizontal, Trash2, Edit } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import type { JournalEntry } from "@/lib/types"

interface EntryListItemProps {
  entry: JournalEntry
  depth: number
  isSelected: boolean
  onSelect: (entry: JournalEntry) => void
  onDelete: (entry: JournalEntry) => void
}

export function EntryListItem({ entry, depth, isSelected, onSelect, onDelete }: EntryListItemProps) {
  return (
    <div
      onClick={() => onSelect(entry)}
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
          <DropdownMenuItem onClick={() => onSelect(entry)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onDelete(entry)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
