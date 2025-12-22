"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format, startOfWeek, endOfWeek } from "date-fns"
import type { CalendarViewMode } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CalendarHeaderProps {
  currentDate: Date
  viewMode: CalendarViewMode
  onNavigate: (direction: "prev" | "next") => void
  onToday: () => void
  onViewModeChange: (mode: CalendarViewMode) => void
}

export function CalendarHeader({ currentDate, viewMode, onNavigate, onToday, onViewModeChange }: CalendarHeaderProps) {
  const getHeaderTitle = () => {
    if (viewMode === "month") {
      return format(currentDate, "MMMM yyyy")
    } else if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate)
      const weekEnd = endOfWeek(currentDate)
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
    } else {
      return format(currentDate, "EEEE, MMMM d, yyyy")
    }
  }

  return (
    <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold">{getHeaderTitle()}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onNavigate("prev")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="sm" onClick={onToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onNavigate("next")}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
        {(["month", "week", "day"] as CalendarViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={cn(
              "px-3 py-1 text-sm font-medium rounded-md transition-all capitalize",
              viewMode === mode
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  )
}
