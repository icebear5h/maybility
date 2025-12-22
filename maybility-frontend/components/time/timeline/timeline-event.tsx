"use client"

import type React from "react"
import { useRef } from "react"
import { cn } from "@/lib/utils"
import type { Event } from "@/lib/types"
import type { OverlapInfo } from "./hooks/useTimelineState"

interface TimelineEventProps {
  entry: Event & { startTime: Date | string; endTime?: Date | string | null }
  x: number
  y: number
  width: number
  height: number
  zoom: number
  isBeingDragged: boolean
  isBeingResized: boolean
  overlapInfo?: OverlapInfo
  stackLevel: number
  totalEventCount: number
  onResizeStart: (e: React.MouseEvent, eventId: string, edge: "left" | "right", event: Event) => void
  onDragStart: (e: React.MouseEvent, event: Event) => void
  onClick: () => void
}

export function TimelineEvent({
  entry,
  x,
  y,
  width,
  height,
  zoom,
  isBeingDragged,
  isBeingResized,
  overlapInfo,
  stackLevel,
  onResizeStart,
  onDragStart,
  onClick,
}: TimelineEventProps) {
  const hasOverlap = overlapInfo && overlapInfo.overlapCount > 0
  const isConflicted = overlapInfo?.isConflicted
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null)
  const isDraggingOrResizing = useRef(false)

  const handleMouseDown = (e: React.MouseEvent, type: "drag" | "resize-left" | "resize-right") => {
    e.stopPropagation()
    e.preventDefault()
    mouseDownPos.current = { x: e.clientX, y: e.clientY }
    isDraggingOrResizing.current = false

    if (type === "drag") {
      onDragStart(e, entry)
    } else {
      onResizeStart(e, entry.id, type === "resize-left" ? "left" : "right", entry)
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!mouseDownPos.current) return

    const dx = Math.abs(e.clientX - mouseDownPos.current.x)
    const dy = Math.abs(e.clientY - mouseDownPos.current.y)

    // If mouse barely moved, treat as click
    if (dx < 5 && dy < 5 && !isBeingDragged && !isBeingResized) {
      onClick()
    }

    mouseDownPos.current = null
  }

  return (
    <div
      className={cn(
        "absolute flex items-center rounded-md border-2 overflow-hidden select-none",
        (isBeingDragged || isBeingResized) && "z-50",
        isBeingDragged && "cursor-grabbing",
        isBeingResized && "cursor-ew-resize",
        !isBeingDragged && !isBeingResized && "cursor-grab",
        hasOverlap
          ? "border-orange-500 bg-orange-100 dark:bg-orange-900/30"
          : "border-blue-500 bg-blue-100 dark:bg-blue-900/30",
        isConflicted && "border-red-500 bg-red-100 dark:bg-red-900/30",
      )}
      style={{ left: x, top: y, width, height }}
      onMouseUp={handleMouseUp}
    >
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 h-full w-3 cursor-ew-resize z-10 hover:bg-black/10"
        onMouseDown={(e) => handleMouseDown(e, "resize-left")}
      />

      {/* Draggable content area */}
      <div
        className="flex-1 flex items-center justify-center px-4 h-full"
        onMouseDown={(e) => handleMouseDown(e, "drag")}
      >
        <span
          className="truncate text-xs font-medium"
          style={{ fontSize: `${10 * Math.max(0.8, zoom)}px` }}
        >
          {entry.title}
        </span>
        <span className="ml-2 text-[10px] text-foreground/40">L{stackLevel}</span>
      </div>

      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 h-full w-3 cursor-ew-resize z-10 hover:bg-black/10"
        onMouseDown={(e) => handleMouseDown(e, "resize-right")}
      />
    </div>
  )
}
