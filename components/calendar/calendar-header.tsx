"use client"

import { format } from "date-fns"
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from "@/components/ui/button"

type CalendarHeaderProps = {
  currentDate: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
}

export function CalendarHeader({ currentDate, onPrevMonth, onNextMonth, onToday }: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-stone-300/80 p-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToday} className="rounded-sm bg-transparent">
          Today
        </Button>
        <Button variant="ghost" size="icon" onClick={onPrevMonth} className="h-8 w-8 rounded-sm">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onNextMonth} className="h-8 w-8 rounded-sm">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <h2 className="text-lg font-semibold text-stone-700 font-serif">{format(currentDate, "MMMM yyyy")}</h2>
      <div className="flex items-center gap-2">
        {/* View toggles can be added here */}
        <span className="text-sm font-medium text-stone-600 rounded-sm bg-stone-200/70 px-3 py-1.5">Month</span>
      </div>
    </div>
  )
}
