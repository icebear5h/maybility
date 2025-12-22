"use client"

import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Clock, ChevronsLeft, ChevronsRight } from "lucide-react"

interface TimelineHeaderProps {
  displayDays: Date[]
  zoom: number
  onZoom: (delta: number) => void
  onNavigate: (direction: number) => void
  onJumpToNow: () => void
  onExpandLeft: () => void
  onExpandRight: () => void
  onContractLeft: () => void
  onContractRight: () => void
  daysBeforeCenter: number
  daysAfterCenter: number
}

export function TimelineHeader({
  displayDays,
  zoom,
  onZoom,
  onNavigate,
  onJumpToNow,
  onExpandLeft,
  onExpandRight,
  onContractLeft,
  onContractRight,
  daysBeforeCenter,
  daysAfterCenter,
}: TimelineHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b bg-background px-4 py-2">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onNavigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onJumpToNow}>
          <Clock className="h-4 w-4 mr-1" />
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={() => onNavigate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Days:</span>
        <Button variant="outline" size="sm" onClick={onContractLeft} disabled={daysBeforeCenter === 0}>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[60px] text-center">
          {daysBeforeCenter} | {daysAfterCenter}
        </span>
        <Button variant="outline" size="sm" onClick={onContractRight} disabled={daysAfterCenter === 0}>
          <ChevronsRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onExpandLeft}>
          + Left
        </Button>
        <Button variant="outline" size="sm" onClick={onExpandRight}>
          + Right
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onZoom(-0.2)} disabled={zoom <= 0.3}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="sm" onClick={() => onZoom(0.2)} disabled={zoom >= 3}>
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
