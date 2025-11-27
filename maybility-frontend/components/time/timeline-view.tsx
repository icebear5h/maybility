"use client"

import type React from "react"
import { useMemo, useState, useRef, useCallback, useEffect } from "react"
import type { JournalEntry } from "@/lib/types"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { addDays } from "date-fns"
import { startOfDay } from "date-fns"
import { endOfDay } from "date-fns"
import { isSameDay } from "date-fns"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, GripVertical, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BranchNode {
  id: string
  parentId: string
  entry: JournalEntry
  level: number
}

interface TimelineViewProps {
  entries: JournalEntry[]
  onSelectEntry: (entry: JournalEntry | null) => void
  onCreateEntry: (date?: Date) => void
  onUpdateEntry?: (entry: JournalEntry) => void
}

export function TimelineView({ entries, onSelectEntry, onCreateEntry, onUpdateEntry }: TimelineViewProps) {
  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [centerDate, setCenterDate] = useState(new Date())
  const [hoverTime, setHoverTime] = useState<{ x: number; date: Date } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mousePositionRef = useRef({ x: 0, y: 0 })

  const [resizing, setResizing] = useState<{
    entryId: string
    edge: "left" | "right"
    startX: number
    originalStart: Date
    originalEnd: Date
  } | null>(null)

  const [draggingEntry, setDraggingEntry] = useState<{
    entryId: string
    startX: number
    originalStart: Date
    originalEnd: Date
  } | null>(null)

  const HOUR_WIDTH = 120 * zoom
  const DAY_WIDTH = 24 * HOUR_WIDTH
  const TOTAL_DAYS = 3
  const TIMELINE_Y = 500
  const ENTRY_HEIGHT = 40 * zoom
  const BRANCH_SPACING = 70 * zoom
  const STACK_OFFSET = 50 * zoom // Vertical offset for stacked events

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const displayDays = useMemo(() => {
    const yesterday = addDays(startOfDay(centerDate), -1)
    const today = startOfDay(centerDate)
    const tomorrow = addDays(startOfDay(centerDate), 1)
    return [yesterday, today, tomorrow]
  }, [centerDate])

  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth
      const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60
      const currentX = DAY_WIDTH + currentHour * HOUR_WIDTH + 60
      setPanOffset({ x: containerWidth / 2 - currentX, y: 0 })
    }
  }, [])

  const calculateStackLevels = useCallback((periodEntries: JournalEntry[]) => {
    const stackLevels: Record<string, number> = {}
    const sortedEntries = [...periodEntries].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )

    sortedEntries.forEach((entry) => {
      const entryStart = new Date(entry.createdAt).getTime()
      const entryEnd = entry.endTime ? new Date(entry.endTime).getTime() : entryStart + 60 * 60 * 1000 // Default 1 hour duration

      // Find overlapping entries that already have stack levels
      const overlapping = sortedEntries.filter((other) => {
        if (other.id === entry.id) return false
        if (stackLevels[other.id] === undefined) return false

        const otherStart = new Date(other.createdAt).getTime()
        const otherEnd = other.endTime ? new Date(other.endTime).getTime() : otherStart + 60 * 60 * 1000

        return entryStart < otherEnd && entryEnd > otherStart
      })

      if (overlapping.length === 0) {
        stackLevels[entry.id] = 0
      } else {
        // Find the first available level
        const usedLevels = new Set(overlapping.map((e) => stackLevels[e.id]))
        let level = 0
        while (usedLevels.has(level)) level++
        stackLevels[entry.id] = level
      }
    })

    return stackLevels
  }, [])

  const timelineData = useMemo(() => {
    const dayStart = startOfDay(displayDays[0])
    const dayEnd = endOfDay(displayDays[2])

    const periodEntries = entries
      .filter((entry) => {
        const entryDate = new Date(entry.createdAt)
        return entryDate >= dayStart && entryDate <= dayEnd && !entry.parentEntryId
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    const branches: BranchNode[] = []
    periodEntries.forEach((entry) => {
      const entryBranches = entries.filter((e) => e.parentEntryId === entry.id)
      entryBranches.forEach((branch, index) => {
        branches.push({
          id: branch.id,
          parentId: entry.id,
          entry: branch,
          level: index + 1,
        })
      })
    })

    const stackLevels = calculateStackLevels(periodEntries)

    return { entries: periodEntries, branches, stackLevels }
  }, [entries, displayDays, calculateStackLevels])

  const getXPosition = (date: Date) => {
    const entryDay = startOfDay(date)
    let dayIndex = displayDays.findIndex((d) => isSameDay(d, entryDay))

    if (dayIndex === -1) {
      if (date < displayDays[0]) dayIndex = 0
      else dayIndex = 2
    }

    const hours = date.getHours()
    const minutes = date.getMinutes()
    return dayIndex * DAY_WIDTH + (hours + minutes / 60) * HOUR_WIDTH + 60
  }

  const getBarWidth = (entry: JournalEntry) => {
    if (!entry.endTime) return HOUR_WIDTH * 0.8
    const start = new Date(entry.createdAt).getTime()
    const end = new Date(entry.endTime).getTime()
    const durationHours = (end - start) / (1000 * 60 * 60)
    return Math.max(HOUR_WIDTH * 0.3, durationHours * HOUR_WIDTH)
  }

  const currentTimeX = useMemo(() => {
    const now = currentTime

    let dayIndex = 1
    if (isSameDay(now, displayDays[0])) dayIndex = 0
    else if (isSameDay(now, displayDays[1])) dayIndex = 1
    else if (isSameDay(now, displayDays[2])) dayIndex = 2

    const hours = now.getHours()
    const minutes = now.getMinutes()
    return dayIndex * DAY_WIDTH + (hours + minutes / 60) * HOUR_WIDTH + 60
  }, [currentTime, HOUR_WIDTH, DAY_WIDTH, displayDays])

  const isCurrentTimeVisible = useMemo(() => {
    const now = currentTime
    return displayDays.some((d) => isSameDay(d, now))
  }, [currentTime, displayDays])

  const navigateDay = (direction: number) => {
    setCenterDate((prev) => addDays(prev, direction))
  }

  const toggleBranches = (entryId: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev)
      if (next.has(entryId)) next.delete(entryId)
      else next.add(entryId)
      return next
    })
  }

  const jumpToNow = () => {
    if (containerRef.current) {
      setCenterDate(new Date())
      const containerWidth = containerRef.current.clientWidth
      const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60
      const nowX = DAY_WIDTH + currentHour * HOUR_WIDTH + 60
      setPanOffset({ x: containerWidth / 2 - nowX, y: panOffset.y })
    }
  }

  const formatHour = (hour: number) => {
    if (hour === 0 || hour === 24) return "12 AM"
    if (hour === 12) return "12 PM"
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`
  }

  const ticks = useMemo(() => {
    const result: Array<{
      x: number
      isHour: boolean
      isQuarter: boolean
      hour: number
      minute: number
      dayIndex: number
    }> = []

    for (let dayIndex = 0; dayIndex < TOTAL_DAYS; dayIndex++) {
      for (let hour = 0; hour <= 24; hour++) {
        for (let quarter = 0; quarter < 4; quarter++) {
          if (hour === 24 && quarter > 0) continue
          const minute = quarter * 15
          const x = dayIndex * DAY_WIDTH + (hour + minute / 60) * HOUR_WIDTH + 60
          result.push({
            x,
            isHour: quarter === 0,
            isQuarter: quarter !== 0,
            hour,
            minute,
            dayIndex,
          })
        }
      }
    }
    return result
  }, [HOUR_WIDTH, DAY_WIDTH])

  const canvasWidth = TOTAL_DAYS * DAY_WIDTH + 200
  const canvasHeight = 700

  const handleZoomButton = (delta: number) => {
    setZoom((prevZoom) => Math.max(0.3, Math.min(3, prevZoom + delta)))
  }

  const getTimeFromX = useCallback(
    (clientX: number): Date | null => {
      if (!containerRef.current) return null
      const rect = containerRef.current.getBoundingClientRect()
      const relativeX = clientX - rect.left - panOffset.x - 60

      const dayIndex = Math.floor(relativeX / DAY_WIDTH)
      if (dayIndex < 0 || dayIndex >= TOTAL_DAYS) return null

      const dayX = relativeX - dayIndex * DAY_WIDTH
      const hours = dayX / HOUR_WIDTH
      if (hours < 0 || hours >= 24) return null

      const date = new Date(displayDays[dayIndex])
      date.setHours(Math.floor(hours))
      date.setMinutes(Math.floor((hours % 1) * 60))
      return date
    },
    [panOffset.x, DAY_WIDTH, HOUR_WIDTH, TOTAL_DAYS, displayDays],
  )

  const handleResizeStart = (e: React.MouseEvent, entryId: string, edge: "left" | "right", entry: JournalEntry) => {
    e.stopPropagation()
    e.preventDefault()
    setResizing({
      entryId,
      edge,
      startX: e.clientX,
      originalStart: new Date(entry.createdAt),
      originalEnd: entry.endTime
        ? new Date(entry.endTime)
        : new Date(new Date(entry.createdAt).getTime() + 60 * 60 * 1000),
    })
  }

  const handleEntryDragStart = (e: React.MouseEvent, entry: JournalEntry) => {
    e.stopPropagation()
    e.preventDefault()
    setDraggingEntry({
      entryId: entry.id,
      startX: e.clientX,
      originalStart: new Date(entry.createdAt),
      originalEnd: entry.endTime
        ? new Date(entry.endTime)
        : new Date(new Date(entry.createdAt).getTime() + 60 * 60 * 1000),
    })
  }

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (resizing || draggingEntry) return
    setIsDragging(true)
    setDragStart({ x: event.clientX - panOffset.x, y: event.clientY - panOffset.y })
  }

  const handleMouseMoveForHover = useCallback(
    (event: React.MouseEvent) => {
      if (isDragging || resizing || draggingEntry) {
        setHoverTime(null)
        return
      }
      const time = getTimeFromX(event.clientX)
      if (time) {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          setHoverTime({ x: event.clientX - rect.left, date: time })
        }
      } else {
        setHoverTime(null)
      }
    },
    [isDragging, resizing, draggingEntry, getTimeFromX],
  )

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (resizing || draggingEntry) return
      const time = getTimeFromX(event.clientX)
      if (time) {
        onCreateEntry(time)
      }
    },
    [getTimeFromX, onCreateEntry, resizing, draggingEntry],
  )

  const handleMouseMoveGlobal = useCallback(
    (event: MouseEvent) => {
      mousePositionRef.current = { x: event.clientX, y: event.clientY }

      if (resizing && onUpdateEntry) {
        const deltaX = event.clientX - resizing.startX
        const deltaHours = deltaX / HOUR_WIDTH

        const entry = entries.find((e) => e.id === resizing.entryId)
        if (!entry) return

        if (resizing.edge === "left") {
          const newStart = new Date(resizing.originalStart.getTime() + deltaHours * 60 * 60 * 1000)
          // Snap to 15 minutes
          newStart.setMinutes(Math.round(newStart.getMinutes() / 15) * 15)
          // Ensure start is before end
          if (newStart < resizing.originalEnd) {
            onUpdateEntry({
              ...entry,
              createdAt: newStart.toISOString(),
            })
          }
        } else {
          const newEnd = new Date(resizing.originalEnd.getTime() + deltaHours * 60 * 60 * 1000)
          // Snap to 15 minutes
          newEnd.setMinutes(Math.round(newEnd.getMinutes() / 15) * 15)
          // Ensure end is after start
          if (newEnd > resizing.originalStart) {
            onUpdateEntry({
              ...entry,
              endTime: newEnd.toISOString(),
            })
          }
        }
        return
      }

      if (draggingEntry && onUpdateEntry) {
        const deltaX = event.clientX - draggingEntry.startX
        const deltaHours = deltaX / HOUR_WIDTH

        const entry = entries.find((e) => e.id === draggingEntry.entryId)
        if (!entry) return

        const newStart = new Date(draggingEntry.originalStart.getTime() + deltaHours * 60 * 60 * 1000)
        const newEnd = new Date(draggingEntry.originalEnd.getTime() + deltaHours * 60 * 60 * 1000)
        // Snap to 15 minutes
        newStart.setMinutes(Math.round(newStart.getMinutes() / 15) * 15)
        newEnd.setMinutes(Math.round(newEnd.getMinutes() / 15) * 15)

        onUpdateEntry({
          ...entry,
          createdAt: newStart.toISOString(),
          endTime: newEnd.toISOString(),
        })
        return
      }

      if (isDragging && containerRef.current) {
        const deltaX = event.clientX - dragStart.x
        const deltaY = event.clientY - dragStart.y
        setPanOffset({ x: deltaX, y: deltaY })
      }
    },
    [isDragging, dragStart, resizing, draggingEntry, entries, onUpdateEntry, HOUR_WIDTH],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setResizing(null)
    setDraggingEntry(null)
  }, [])

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMoveGlobal(e)
    const handleGlobalMouseUp = () => handleMouseUp()

    if (resizing || draggingEntry) {
      window.addEventListener("mousemove", handleGlobalMouseMove)
      window.addEventListener("mouseup", handleGlobalMouseUp)
      return () => {
        window.removeEventListener("mousemove", handleGlobalMouseMove)
        window.removeEventListener("mouseup", handleGlobalMouseUp)
      }
    }
  }, [resizing, draggingEntry, handleMouseMoveGlobal, handleMouseUp])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <div>
          <h2 className="text-2xl font-semibold">Possibility Timeline</h2>
          <p className="text-sm text-muted-foreground">
            Double-click to add, drag edges to resize, drag center to move
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-card/50 p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleZoomButton(-0.2)}
              disabled={zoom <= 0.3}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleZoomButton(0.2)}
              disabled={zoom >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDay(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[200px] text-center font-medium">
              {format(displayDays[0], "MMM d")} – {format(displayDays[2], "MMM d, yyyy")}
            </div>
            <Button variant="outline" size="icon" onClick={() => navigateDay(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={jumpToNow} className="ml-2 text-red-500 hover:text-red-400">
              Now
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className={cn(
          "flex-1 overflow-hidden bg-background",
          resizing
            ? "cursor-ew-resize"
            : draggingEntry
              ? "cursor-grabbing"
              : isDragging
                ? "cursor-grabbing"
                : "cursor-grab",
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => {
          handleMouseMoveGlobal(e.nativeEvent)
          handleMouseMoveForHover(e)
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (!resizing && !draggingEntry) {
            handleMouseUp()
          }
          setHoverTime(null)
        }}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className="relative h-full"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            width: canvasWidth,
            height: canvasHeight,
          }}
        >
          {/* SVG for lines and ticks */}
          <svg className="absolute inset-0" width={canvasWidth} height={canvasHeight} style={{ overflow: "visible" }}>
            {/* Main horizontal timeline axis */}
            <line
              x1={0}
              y1={TIMELINE_Y}
              x2={canvasWidth}
              y2={TIMELINE_Y}
              stroke="currentColor"
              strokeWidth={2}
              className="text-foreground/70"
            />
            {/* Arrow head */}
            <polygon
              points={`${canvasWidth - 10},${TIMELINE_Y} ${canvasWidth - 22},${TIMELINE_Y - 7} ${canvasWidth - 22},${TIMELINE_Y + 7}`}
              className="fill-foreground/70"
            />

            {displayDays.map((day, dayIndex) => {
              const dayX = dayIndex * DAY_WIDTH + 60
              const isToday = isSameDay(day, new Date())
              return (
                <g key={`day-${dayIndex}`}>
                  {dayIndex > 0 && (
                    <line
                      x1={dayX}
                      y1={100}
                      x2={dayX}
                      y2={TIMELINE_Y + 60}
                      stroke="currentColor"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      className="text-foreground/20"
                    />
                  )}
                  <text
                    x={dayX + DAY_WIDTH / 2 - 60}
                    y={80}
                    textAnchor="middle"
                    className={cn("fill-foreground/60", isToday && "fill-primary font-semibold")}
                    style={{ fontSize: `${14 * Math.max(0.7, zoom)}px` }}
                  >
                    {format(day, "EEEE, MMM d")}
                    {isToday && " (Today)"}
                  </text>
                </g>
              )
            })}

            {ticks.map((tick, index) => {
              const tickHeight = tick.isHour ? 24 : 10
              return (
                <line
                  key={index}
                  x1={tick.x}
                  y1={TIMELINE_Y - tickHeight / 2}
                  x2={tick.x}
                  y2={TIMELINE_Y + tickHeight / 2}
                  stroke="currentColor"
                  strokeWidth={tick.isHour ? 2.5 : 1}
                  className={tick.isHour ? "text-foreground/80" : "text-foreground/30"}
                />
              )
            })}

            {ticks
              .filter((tick) => tick.isHour && tick.hour < 24)
              .map((tick, idx) => (
                <text
                  key={`label-${idx}`}
                  x={tick.x}
                  y={TIMELINE_Y + 40}
                  textAnchor="middle"
                  className="fill-foreground/60"
                  style={{ fontSize: `${11 * Math.max(0.7, zoom)}px`, fontWeight: 500 }}
                >
                  {formatHour(tick.hour)}
                </text>
              ))}

            {isCurrentTimeVisible && (
              <g>
                <line
                  x1={currentTimeX}
                  y1={50}
                  x2={currentTimeX}
                  y2={TIMELINE_Y + 30}
                  stroke="#ef4444"
                  strokeWidth={2.5}
                />
                <circle cx={currentTimeX} cy={TIMELINE_Y} r={6} fill="#ef4444" />
                <text
                  x={currentTimeX}
                  y={35}
                  textAnchor="middle"
                  fill="#ef4444"
                  style={{ fontSize: "11px", fontWeight: 600 }}
                >
                  {format(currentTime, "h:mm a")}
                </text>
              </g>
            )}

            {/* Branch lines */}
            {timelineData.entries.map((entry) => {
              const entryBranches = timelineData.branches.filter((b) => b.parentId === entry.id)
              if (entryBranches.length === 0 || !expandedEntries.has(entry.id)) return null

              const stackLevel = timelineData.stackLevels[entry.id] || 0
              const entryX = getXPosition(new Date(entry.createdAt))
              const entryRight = entryX + getBarWidth(entry)
              const entryY = TIMELINE_Y - 100 - stackLevel * STACK_OFFSET

              return (
                <g key={`lines-${entry.id}`}>
                  {entryBranches.map((branch, idx) => {
                    const branchY = entryY - (idx + 1) * BRANCH_SPACING
                    const branchX = entryRight + 50

                    return (
                      <g key={branch.id}>
                        <circle cx={entryRight} cy={entryY + ENTRY_HEIGHT / 2} r={5} className="fill-primary" />
                        <path
                          d={`M ${entryRight} ${entryY + ENTRY_HEIGHT / 2} 
                              L ${entryRight + 25} ${entryY + ENTRY_HEIGHT / 2}
                              L ${entryRight + 25} ${branchY + ENTRY_HEIGHT / 2}
                              L ${branchX} ${branchY + ENTRY_HEIGHT / 2}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          className="text-foreground/50"
                        />
                        <polygon
                          points={`${branchX},${branchY + ENTRY_HEIGHT / 2} ${branchX - 7},${branchY + ENTRY_HEIGHT / 2 - 5} ${branchX - 7},${branchY + ENTRY_HEIGHT / 2 + 5}`}
                          className="fill-foreground/50"
                        />
                        <circle cx={branchX} cy={branchY + ENTRY_HEIGHT / 2} r={5} className="fill-primary" />
                      </g>
                    )
                  })}
                </g>
              )
            })}
          </svg>

          {timelineData.entries.map((entry) => {
            const x = getXPosition(new Date(entry.createdAt))
            const width = getBarWidth(entry)
            const stackLevel = timelineData.stackLevels[entry.id] || 0
            const y = TIMELINE_Y - 100 - stackLevel * STACK_OFFSET
            const hasBranches = timelineData.branches.some((b) => b.parentId === entry.id)
            const isExpanded = expandedEntries.has(entry.id)
            const isBeingDragged = draggingEntry?.entryId === entry.id
            const isBeingResized = resizing?.entryId === entry.id

            return (
              <div
                key={entry.id}
                className={cn(
                  "group absolute flex cursor-pointer items-center rounded-lg border-2 bg-background transition-all",
                  "hover:border-foreground/60",
                  isExpanded ? "border-foreground/70" : "border-foreground/40",
                  (isBeingDragged || isBeingResized) && "border-primary shadow-lg z-50",
                )}
                style={{
                  left: x,
                  top: y,
                  width: width,
                  height: ENTRY_HEIGHT,
                }}
                onClick={() => {
                  if (!resizing && !draggingEntry) {
                    onSelectEntry(entry)
                    if (hasBranches) toggleBranches(entry.id)
                  }
                }}
              >
                {/* Left resize handle */}
                <div
                  className="absolute left-0 top-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-primary/30 rounded-l-lg transition-opacity"
                  onMouseDown={(e) => handleResizeStart(e, entry.id, "left", entry)}
                >
                  <div className="absolute left-0.5 top-1/2 -translate-y-1/2 h-4 w-0.5 bg-foreground/40 rounded" />
                </div>

                {/* Center drag area */}
                <div
                  className="flex-1 flex items-center justify-center px-3 cursor-grab active:cursor-grabbing"
                  onMouseDown={(e) => handleEntryDragStart(e, entry)}
                >
                  <GripVertical className="h-3 w-3 text-foreground/30 mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span
                    className="truncate text-center font-medium text-foreground"
                    style={{ fontSize: `${14 * Math.max(0.7, zoom)}px` }}
                  >
                    {entry.title}
                  </span>
                </div>

                {/* Right resize handle */}
                <div
                  className="absolute right-0 top-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-primary/30 rounded-r-lg transition-opacity"
                  onMouseDown={(e) => handleResizeStart(e, entry.id, "right", entry)}
                >
                  <div className="absolute right-0.5 top-1/2 -translate-y-1/2 h-4 w-0.5 bg-foreground/40 rounded" />
                </div>

                {/* Time tooltip when resizing */}
                {isBeingResized && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded whitespace-nowrap">
                    {format(new Date(entry.createdAt), "h:mm a")} -{" "}
                    {entry.endTime ? format(new Date(entry.endTime), "h:mm a") : ""}
                  </div>
                )}
              </div>
            )
          })}

          {/* Branch entries */}
          {timelineData.entries.map((entry) => {
            const entryBranches = timelineData.branches.filter((b) => b.parentId === entry.id)
            if (entryBranches.length === 0 || !expandedEntries.has(entry.id)) return null

            const stackLevel = timelineData.stackLevels[entry.id] || 0
            const entryX = getXPosition(new Date(entry.createdAt))
            const entryRight = entryX + getBarWidth(entry)
            const baseY = TIMELINE_Y - 100 - stackLevel * STACK_OFFSET

            return entryBranches.map((branch, idx) => {
              const branchY = baseY - (idx + 1) * BRANCH_SPACING
              const branchX = entryRight + 50

              return (
                <div
                  key={branch.id}
                  className={cn(
                    "absolute flex cursor-pointer items-center justify-center rounded-lg border-2 border-foreground/40 bg-background px-4 transition-all",
                    "hover:border-foreground/60",
                  )}
                  style={{
                    left: branchX,
                    top: branchY,
                    width: getBarWidth(branch.entry),
                    height: ENTRY_HEIGHT,
                  }}
                  onClick={() => onSelectEntry(branch.entry)}
                >
                  <span
                    className="truncate text-center font-medium text-foreground"
                    style={{ fontSize: `${14 * Math.max(0.7, zoom)}px` }}
                  >
                    {branch.entry.branchLabel || branch.entry.title}
                  </span>
                </div>
              )
            })
          })}

          {/* Hover indicator */}
          {hoverTime && !isDragging && !resizing && !draggingEntry && (
            <div
              className="pointer-events-none absolute z-30 flex flex-col items-center"
              style={{
                left: hoverTime.x + panOffset.x,
                top: TIMELINE_Y - 140,
              }}
            >
              <div className="rounded-md bg-primary/90 px-2 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">
                {format(hoverTime.date, "h:mm a")}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Double-click to add</div>
              <div className="mt-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-primary/50 bg-primary/10">
                <Plus className="h-4 w-4 text-primary" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
