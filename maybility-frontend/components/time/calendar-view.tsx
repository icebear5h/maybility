"use client"

import type React from "react"

import { useState, useMemo } from "react"
import type { JournalEntry, CalendarViewMode, Task, Goal } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, Repeat, Target } from "lucide-react"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isToday,
  startOfDay,
  getHours,
  getMinutes,
  addMinutes,
  isBefore,
  isAfter,
} from "date-fns"

const EVENT_COLORS = [
  { name: "Tomato", bg: "bg-red-500", hex: "#ef4444", text: "text-white", border: "border-l-red-600" },
  { name: "Flamingo", bg: "bg-pink-400", hex: "#f472b6", text: "text-white", border: "border-l-pink-500" },
  { name: "Tangerine", bg: "bg-orange-400", hex: "#fb923c", text: "text-white", border: "border-l-orange-500" },
  { name: "Banana", bg: "bg-yellow-400", hex: "#facc15", text: "text-gray-900", border: "border-l-yellow-500" },
  { name: "Sage", bg: "bg-green-500", hex: "#22c55e", text: "text-white", border: "border-l-green-600" },
  { name: "Basil", bg: "bg-emerald-600", hex: "#059669", text: "text-white", border: "border-l-emerald-700" },
  { name: "Peacock", bg: "bg-cyan-500", hex: "#06b6d4", text: "text-white", border: "border-l-cyan-600" },
  { name: "Blueberry", bg: "bg-blue-500", hex: "#3b82f6", text: "text-white", border: "border-l-blue-600" },
  { name: "Lavender", bg: "bg-purple-400", hex: "#c084fc", text: "text-white", border: "border-l-purple-500" },
  { name: "Grape", bg: "bg-purple-600", hex: "#9333ea", text: "text-white", border: "border-l-purple-700" },
  { name: "Graphite", bg: "bg-gray-500", hex: "#6b7280", text: "text-white", border: "border-l-gray-600" },
]

const getEventColorClasses = (colorName?: string) => {
  const color = EVENT_COLORS.find((c) => c.name.toLowerCase() === colorName?.toLowerCase()) || EVENT_COLORS[4] // Default to Sage
  return color
}

const getColorFromHex = (hex: string) => {
  // Convert hex to RGB for dynamic styling
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  // Determine if text should be light or dark based on luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return {
    hex,
    text: luminance > 0.5 ? "#1f2937" : "#ffffff",
    isLight: luminance > 0.5,
  }
}

const entryOccursOnDate = (entry: JournalEntry, date: Date): boolean => {
  const entryDate = new Date(entry.createdAt)

  // Check if it's the original date
  if (isSameDay(entryDate, date)) return true

  // Check recurrence
  if (!entry.recurrence) return false

  const rule = entry.recurrence

  // Don't show before original date
  if (isBefore(date, startOfDay(entryDate))) return false

  // Check end date
  if (rule.endDate && isAfter(date, new Date(rule.endDate))) return false

  const daysDiff = Math.floor((date.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))

  switch (rule.frequency) {
    case "daily":
      return daysDiff % rule.interval === 0
    case "weekly":
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        return rule.daysOfWeek.includes(date.getDay())
      }
      return daysDiff % (rule.interval * 7) === 0
    case "monthly":
      return (
        entryDate.getDate() === date.getDate() &&
        (date.getMonth() - entryDate.getMonth() + 12 * (date.getFullYear() - entryDate.getFullYear())) %
          rule.interval ===
          0
      )
    case "yearly":
      return (
        entryDate.getDate() === date.getDate() &&
        entryDate.getMonth() === date.getMonth() &&
        (date.getFullYear() - entryDate.getFullYear()) % rule.interval === 0
      )
    default:
      return false
  }
}

interface CalendarViewProps {
  entries: JournalEntry[]
  onSelectEntry: (entry: JournalEntry | null) => void
  onCreateEntry?: (date?: Date) => void
  onUpdateEntry?: (entry: JournalEntry) => void
  isDraggingTask?: boolean
  onTaskDrop?: (task: Task, date: Date) => void
  goals?: Goal[]
}

export function CalendarView({
  entries,
  onSelectEntry,
  onCreateEntry,
  onUpdateEntry,
  isDraggingTask = false,
  goals = [],
  onTaskDrop, // Declare the variable here
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week")
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [draggingEntry, setDraggingEntry] = useState<JournalEntry | null>(null)

  const [resizingEntry, setResizingEntry] = useState<{
    entry: JournalEntry
    edge: "top" | "bottom"
    startY: number
    originalStart: Date
    originalEnd: Date
  } | null>(null)
  const HOUR_HEIGHT = 60

  const getEntriesForDate = (date: Date): JournalEntry[] => {
    return entries.filter((entry) => entryOccursOnDate(entry, date))
  }

  const getAllDayEntries = (date: Date): JournalEntry[] => {
    return getEntriesForDate(date).filter((entry) => entry.isAllDay)
  }

  const getTimedEntries = (date: Date): JournalEntry[] => {
    return getEntriesForDate(date).filter((entry) => !entry.isAllDay)
  }

  const calculateEventColumns = (events: JournalEntry[]): Map<string, { column: number; totalColumns: number }> => {
    const positions = new Map<string, { column: number; totalColumns: number }>()

    if (events.length === 0) return positions

    // Helper to get event time range
    const getTimeRange = (event: JournalEntry) => {
      const start = new Date(event.createdAt).getTime()
      const end = event.endTime ? new Date(event.endTime).getTime() : start + (event.duration || 60) * 60 * 1000
      return { start, end }
    }

    // Check if two events overlap
    const eventsOverlap = (a: JournalEntry, b: JournalEntry) => {
      const aRange = getTimeRange(a)
      const bRange = getTimeRange(b)
      return aRange.start < bRange.end && aRange.end > bRange.start
    }

    // Group events that overlap with each other (connected components)
    const groups: JournalEntry[][] = []
    const assigned = new Set<string>()

    events.forEach((event) => {
      if (assigned.has(event.id)) return

      // Find all events that overlap with this one (directly or transitively)
      const group: JournalEntry[] = [event]
      assigned.add(event.id)

      let i = 0
      while (i < group.length) {
        const current = group[i]
        events.forEach((other) => {
          if (!assigned.has(other.id) && eventsOverlap(current, other)) {
            group.push(other)
            assigned.add(other.id)
          }
        })
        i++
      }

      groups.push(group)
    })

    // For each group, assign columns
    groups.forEach((group) => {
      if (group.length === 1) {
        // No overlap - full width
        positions.set(group[0].id, { column: 0, totalColumns: 1 })
        return
      }

      // Sort by start time
      const sorted = [...group].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

      // Assign columns within this group
      const columns: JournalEntry[][] = []

      sorted.forEach((event) => {
        const eventRange = getTimeRange(event)

        // Find first column where event doesn't overlap with the last event
        let columnIndex = 0
        let foundSlot = false

        for (let i = 0; i < columns.length; i++) {
          const lastInColumn = columns[i][columns[i].length - 1]
          const lastRange = getTimeRange(lastInColumn)

          if (eventRange.start >= lastRange.end) {
            columnIndex = i
            foundSlot = true
            break
          }
        }

        if (!foundSlot) {
          columnIndex = columns.length
        }

        if (!columns[columnIndex]) {
          columns[columnIndex] = []
        }
        columns[columnIndex].push(event)
      })

      // Assign positions for this group
      sorted.forEach((event) => {
        for (let i = 0; i < columns.length; i++) {
          if (columns[i].includes(event)) {
            positions.set(event.id, { column: i, totalColumns: columns.length })
            break
          }
        }
      })
    })

    return positions
  }

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate)
    const weekEnd = endOfWeek(currentDate)
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
  }, [currentDate])

  const navigate = (direction: "prev" | "next") => {
    if (viewMode === "month") {
      setCurrentDate(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1))
    } else if (viewMode === "week") {
      setCurrentDate(direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1))
    } else {
      setCurrentDate(direction === "prev" ? subDays(currentDate, 1) : addDays(currentDate, 1))
    }
  }

  const handleEntryDragStart = (e: React.DragEvent, entry: JournalEntry) => {
    e.stopPropagation()
    setDraggingEntry(entry)
    e.dataTransfer.setData("application/entry", JSON.stringify(entry))
    e.dataTransfer.effectAllowed = "move"
  }

  const handleEntryDragEnd = () => {
    setDraggingEntry(null)
  }

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDropTarget(targetId)
  }

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  const handleDrop = (e: React.DragEvent, date: Date, hour?: number, minute?: number) => {
    e.preventDefault()
    setDropTarget(null)

    try {
      const entryData = e.dataTransfer.getData("application/entry")
      if (entryData && onUpdateEntry) {
        const entry = JSON.parse(entryData) as JournalEntry
        const targetDate = new Date(date)
        if (hour !== undefined) {
          targetDate.setHours(hour, minute || 0, 0, 0)
        } else {
          const originalDate = new Date(entry.createdAt)
          targetDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0)
        }
        onUpdateEntry({ ...entry, createdAt: targetDate.toISOString() })
        setDraggingEntry(null)
        return
      }
    } catch (err) {}

    try {
      const taskData = e.dataTransfer.getData("application/json")
      if (taskData && onTaskDrop) {
        const task = JSON.parse(taskData) as Task
        const targetDate = new Date(date)
        if (hour !== undefined) {
          targetDate.setHours(hour, minute || 0, 0, 0)
        }
        onTaskDrop(task, targetDate)
      }
    } catch (err) {
      console.error("Failed to parse dropped data:", err)
    }
  }

  const handleResizeStart = (e: React.MouseEvent, entry: JournalEntry, edge: "top" | "bottom") => {
    e.stopPropagation()
    e.preventDefault()

    const startTime = new Date(entry.createdAt)
    const endTime = entry.endTime ? new Date(entry.endTime) : addMinutes(startTime, entry.duration || 60)

    setResizingEntry({
      entry,
      edge,
      startY: e.clientY,
      originalStart: startTime,
      originalEnd: endTime,
    })
  }

  const handleResizeMove = (e: React.MouseEvent) => {
    if (!resizingEntry || !onUpdateEntry) return

    const deltaY = e.clientY - resizingEntry.startY
    const deltaMinutes = Math.round(((deltaY / HOUR_HEIGHT) * 60) / 15) * 15 // Snap to 15min

    let newStart = resizingEntry.originalStart
    let newEnd = resizingEntry.originalEnd

    if (resizingEntry.edge === "top") {
      newStart = addMinutes(resizingEntry.originalStart, deltaMinutes)
      // Ensure minimum 15 min duration
      if (newStart >= newEnd) {
        newStart = addMinutes(newEnd, -15)
      }
    } else {
      newEnd = addMinutes(resizingEntry.originalEnd, deltaMinutes)
      // Ensure minimum 15 min duration
      if (newEnd <= newStart) {
        newEnd = addMinutes(newStart, 15)
      }
    }

    // Update the entry in real-time
    onUpdateEntry({
      ...resizingEntry.entry,
      createdAt: newStart.toISOString(),
      endTime: newEnd.toISOString(),
      duration: Math.round((newEnd.getTime() - newStart.getTime()) / 60000),
    })
  }

  const handleResizeEnd = () => {
    setResizingEntry(null)
  }

  const getEntryColor = (entry: JournalEntry) => {
    // If entry has a goalId, use the goal's color
    if (entry.goalId) {
      const goal = goals.find((g) => g.id === entry.goalId)
      if (goal) {
        const hexColor = getColorFromHex(goal.color)
        return {
          style: {
            backgroundColor: goal.color,
            color: hexColor.text,
            borderLeftColor: goal.color,
          },
          goalTitle: goal.title,
          isGoalColor: true,
        }
      }
    }
    // Otherwise use the entry's own color
    const colorClasses = getEventColorClasses(entry.colorName) // Use colorName from EVENT_COLORS
    return {
      classes: colorClasses,
      isGoalColor: false,
    }
  }

  const EventCard = ({
    entry,
    style,
    isCompact = false,
    showResizeHandles = false, // Added prop
  }: {
    entry: JournalEntry
    style?: React.CSSProperties
    isCompact?: boolean
    showResizeHandles?: boolean
  }) => {
    const entryColor = getEntryColor(entry)
    const startTime = new Date(entry.createdAt)
    const endTime = entry.endTime ? new Date(entry.endTime) : addMinutes(startTime, entry.duration || 60)

    return (
      <div
        draggable={!resizingEntry}
        onDragStart={(e) => handleEntryDragStart(e, entry)}
        onDragEnd={handleEntryDragEnd}
        onClick={(e) => {
          e.stopPropagation()
          onSelectEntry(entry)
        }}
        style={{
          ...style,
          ...(entryColor.isGoalColor ? entryColor.style : {}),
        }}
        className={cn(
          "absolute rounded-md cursor-grab active:cursor-grabbing transition-all overflow-hidden group",
          "border-l-4 shadow-sm hover:shadow-md hover:z-50",
          !entryColor.isGoalColor && entryColor.classes?.bg,
          !entryColor.isGoalColor && entryColor.classes?.text,
          !entryColor.isGoalColor && entryColor.classes?.border,
          draggingEntry?.id === entry.id && "opacity-50 ring-2 ring-white",
          resizingEntry?.entry.id === entry.id && "ring-2 ring-primary z-50",
          isCompact ? "px-1 py-0.5" : "px-2 py-1",
        )}
      >
        {showResizeHandles && (
          <div
            onMouseDown={(e) => handleResizeStart(e, entry, "top")}
            className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/20 hover:bg-white/40 transition-opacity"
          />
        )}

        <div className="flex items-start gap-1">
          <div className="flex-1 min-w-0">
            <div className={cn("font-medium truncate", isCompact ? "text-xs" : "text-sm")}>{entry.title}</div>
            {!isCompact && (
              <div className="text-xs opacity-90">
                {format(startTime, "h:mm")} - {format(endTime, "h:mma").toLowerCase()}
              </div>
            )}
          </div>
          {entryColor.isGoalColor && (
            <Target className={cn("shrink-0 opacity-75", isCompact ? "h-3 w-3" : "h-4 w-4")} />
          )}
          {entry.recurrence && <Repeat className={cn("shrink-0 opacity-75", isCompact ? "h-3 w-3" : "h-4 w-4")} />}
        </div>

        {showResizeHandles && (
          <div
            onMouseDown={(e) => handleResizeStart(e, entry, "bottom")}
            className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/20 hover:bg-white/40 transition-opacity"
          />
        )}
      </div>
    )
  }

  const AllDayEventBanner = ({ entry }: { entry: JournalEntry }) => {
    const entryColor = getEntryColor(entry)

    return (
      <div
        draggable
        onDragStart={(e) => handleEntryDragStart(e, entry)}
        onDragEnd={handleEntryDragEnd}
        onClick={(e) => {
          e.stopPropagation()
          onSelectEntry(entry)
        }}
        style={entryColor.isGoalColor ? entryColor.style : {}}
        className={cn(
          "rounded px-2 py-1 text-xs font-medium cursor-grab active:cursor-grabbing",
          "truncate mb-0.5",
          !entryColor.isGoalColor && entryColor.classes?.bg,
          !entryColor.isGoalColor && entryColor.classes?.text,
          draggingEntry?.id === entry.id && "opacity-50",
        )}
      >
        <div className="flex items-center gap-1">
          <span className="truncate">{entry.title}</span>
          {entryColor.isGoalColor && <Target className="h-3 w-3 shrink-0 opacity-75" />}
          {entry.recurrence && <Repeat className="h-3 w-3 shrink-0 opacity-75" />}
        </div>
      </div>
    )
  }

  const renderMonthView = () => (
    <>
      {/* Day headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 flex-1">
        {calendarDays.map((day, index) => {
          const dateKey = format(day, "yyyy-MM-dd")
          const dayEntries = getEntriesForDate(day)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const isDropTarget = dropTarget === dateKey

          return (
            <div
              key={index}
              onClick={() => setSelectedDate(day)}
              onDragOver={(e) => handleDragOver(e, dateKey)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day)}
              className={cn(
                "relative flex min-h-[100px] flex-col rounded-lg border p-2 text-left transition-all cursor-pointer",
                isCurrentMonth ? "border-border/50 hover:border-primary/50" : "border-transparent opacity-40",
                isSelected && "border-primary ring-1 ring-primary",
                isToday(day) && "bg-primary/5",
                (isDraggingTask || draggingEntry) && "border-dashed",
                isDropTarget && "border-primary bg-primary/10 ring-2 ring-primary",
              )}
            >
              <span className={cn("text-sm font-medium", isToday(day) && "text-primary")}>{format(day, "d")}</span>

              {dayEntries.length > 0 && (
                <div className="mt-1 space-y-0.5 overflow-hidden">
                  {dayEntries.slice(0, 3).map((entry) => {
                    const entryColor = getEntryColor(entry)
                    return (
                      <div
                        key={entry.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectEntry(entry)
                        }}
                        style={
                          entryColor.isGoalColor
                            ? { backgroundColor: entryColor.style?.backgroundColor, color: entryColor.style?.color }
                            : {}
                        }
                        className={cn(
                          "rounded px-1.5 py-0.5 text-xs truncate cursor-pointer flex items-center gap-1",
                          !entryColor.isGoalColor && entryColor.classes?.bg,
                          !entryColor.isGoalColor && entryColor.classes?.text,
                        )}
                      >
                        {!entry.isAllDay && (
                          <span className="opacity-75">{format(new Date(entry.createdAt), "h:mm")}</span>
                        )}
                        <span className="truncate">{entry.title}</span>
                        {entryColor.isGoalColor && <Target className="h-3 w-3 shrink-0 opacity-75" />}
                      </div>
                    )
                  })}
                  {dayEntries.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1">+{dayEntries.length - 3} more</div>
                  )}
                </div>
              )}

              {isDropTarget && !dayEntries.length && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-primary/10 pointer-events-none">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )

  const renderWeekView = () => {
    const HOUR_HEIGHT = 60 // pixels per hour
    const HEADER_HEIGHT = 80 // All-day events section height

    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with day names and all-day events */}
        <div className="border-b border-border/50">
          {/* Day headers */}
          <div className="grid grid-cols-8">
            <div className="w-16 shrink-0 border-r border-border/30" />
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "flex flex-col items-center py-2 border-r border-border/30",
                  isToday(day) && "bg-primary/5",
                )}
              >
                <span className="text-xs text-muted-foreground uppercase">{format(day, "EEE")}</span>
                <span
                  className={cn(
                    "text-2xl font-light mt-0.5",
                    isToday(day) &&
                      "bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
            ))}
          </div>

          {/* All-day events row */}
          <div className="grid grid-cols-8 min-h-[32px]">
            <div className="w-16 shrink-0 border-r border-border/30 text-xs text-muted-foreground text-right pr-2 py-1">
              GMT-05
            </div>
            {weekDays.map((day) => {
              const allDayEntries = getAllDayEntries(day)
              return (
                <div
                  key={day.toISOString()}
                  className={cn("border-r border-border/30 p-0.5 min-h-[32px]", isToday(day) && "bg-primary/5")}
                >
                  {allDayEntries.map((entry) => (
                    <AllDayEventBanner key={entry.id} entry={entry} />
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {/* Time grid with events */}
        <div className="flex-1 overflow-auto">
          <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
            {/* Hour lines */}
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={hour}
                className="absolute w-full border-b border-border/30 grid grid-cols-8"
                style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
              >
                <div className="w-16 shrink-0 pr-2 text-right border-r border-border/30">
                  <span className="text-xs text-muted-foreground relative -top-2">
                    {hour === 0 ? "" : format(new Date().setHours(hour, 0), "h a")}
                  </span>
                </div>
                {weekDays.map((day) => {
                  const cellId = `${format(day, "yyyy-MM-dd")}-${hour}`
                  const isDropTargetCell = dropTarget === cellId

                  return (
                    <div
                      key={day.toISOString()}
                      onDragOver={(e) => handleDragOver(e, cellId)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, day, hour)}
                      onClick={() => {
                        const newDate = new Date(day)
                        newDate.setHours(hour)
                        onCreateEntry?.(newDate)
                      }}
                      className={cn(
                        "border-r border-border/30 cursor-pointer hover:bg-muted/20",
                        isToday(day) && "bg-primary/5",
                        (isDraggingTask || draggingEntry) && "border-dashed",
                        isDropTargetCell && "bg-primary/20",
                      )}
                    />
                  )
                })}
              </div>
            ))}

            {/* Events overlay */}
            <div className="absolute inset-0 grid grid-cols-8 pointer-events-none">
              <div className="w-16 shrink-0" />
              {weekDays.map((day, dayIndex) => {
                const timedEntries = getTimedEntries(day)
                const positions = calculateEventColumns(timedEntries)

                return (
                  <div key={day.toISOString()} className="relative border-r border-transparent">
                    {timedEntries.map((entry) => {
                      const startTime = new Date(entry.createdAt)
                      const endTime = entry.endTime
                        ? new Date(entry.endTime)
                        : addMinutes(startTime, entry.duration || 60)

                      const startMinutes = getHours(startTime) * 60 + getMinutes(startTime)
                      const endMinutes = getHours(endTime) * 60 + getMinutes(endTime)
                      const durationMinutes = endMinutes - startMinutes

                      const top = (startMinutes / 60) * HOUR_HEIGHT
                      const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20)

                      const pos = positions.get(entry.id) || { column: 0, totalColumns: 1 }
                      const width = `calc(${100 / pos.totalColumns}% - 4px)`
                      const left = `calc(${(pos.column / pos.totalColumns) * 100}% + 2px)`

                      return (
                        <EventCard
                          key={entry.id}
                          entry={entry}
                          isCompact={durationMinutes < 45}
                          showResizeHandles={true} // Enable resize handles
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            left,
                            width,
                            pointerEvents: "auto",
                          }}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* Current time indicator */}
            {weekDays.some((day) => isToday(day)) && (
              <div
                className="absolute left-16 right-0 flex items-center z-40 pointer-events-none"
                style={{
                  top: `${((new Date().getHours() * 60 + new Date().getMinutes()) / 60) * HOUR_HEIGHT}px`,
                }}
              >
                <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5" />
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderDayViewSidebar = () => {
    const timedEntries = getTimedEntries(currentDate)
    const allDayEntries = getAllDayEntries(currentDate)

    return (
      <div className="w-72 border-l border-border/50 bg-card/30 p-4 overflow-auto">
        <h3 className="text-lg font-medium mb-4">{format(currentDate, "EEEE, MMMM d")}</h3>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground">{timedEntries.length + allDayEntries.length} events</p>
        </div>

        {timedEntries.length > 0 || allDayEntries.length > 0 ? (
          <div className="space-y-2">
            {[...allDayEntries, ...timedEntries].map((entry) => {
              const entryColor = getEntryColor(entry)
              return (
                <button
                  key={entry.id}
                  onClick={() => onSelectEntry(entry)}
                  style={entryColor.isGoalColor ? entryColor.style : {}}
                  className={cn(
                    "w-full rounded-lg p-3 text-left transition-all hover:opacity-80",
                    !entryColor.isGoalColor && entryColor.classes?.bg,
                    !entryColor.isGoalColor && entryColor.classes?.text,
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {!entry.isAllDay && (
                      <span className="text-xs opacity-75">{format(new Date(entry.createdAt), "h:mm a")}</span>
                    )}
                    {entry.isAllDay && <span className="text-xs opacity-75">All day</span>}
                    {entryColor.isGoalColor && <Target className="h-3 w-3 opacity-75" />}
                    {entry.recurrence && <Repeat className="h-3 w-3 opacity-75" />}
                  </div>
                  <h4 className="font-medium">{entry.title}</h4>
                  {entryColor.isGoalColor && entryColor.goalTitle && (
                    <p className="text-xs opacity-60 mt-1">Goal: {entryColor.goalTitle}</p>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No events for this day</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent"
              onClick={() => onCreateEntry?.(currentDate)}
            >
              <Plus className="h-4 w-4" />
              Add Event
            </Button>
          </div>
        )}
      </div>
    )
  }

  const renderDayView = () => {
    const timedEntries = getTimedEntries(currentDate)
    const allDayEntries = getAllDayEntries(currentDate)
    const positions = calculateEventColumns(timedEntries)

    return (
      <div
        className="flex flex-1 overflow-hidden"
        onMouseMove={resizingEntry ? handleResizeMove : undefined}
        onMouseUp={resizingEntry ? handleResizeEnd : undefined}
        onMouseLeave={resizingEntry ? handleResizeEnd : undefined}
      >
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* All-day events */}
          {allDayEntries.length > 0 && (
            <div className="border-b border-border/50 p-2">
              <div className="text-xs text-muted-foreground mb-1">All day</div>
              <div className="space-y-1">
                {allDayEntries.map((entry) => (
                  <AllDayEventBanner key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          )}

          {/* Time grid */}
          <div className="flex-1 overflow-auto">
            <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
              {/* Hour lines */}
              {Array.from({ length: 24 }, (_, hour) => {
                const cellId = `${format(currentDate, "yyyy-MM-dd")}-${hour}`
                const isDropTargetCell = dropTarget === cellId

                return (
                  <div
                    key={hour}
                    className="absolute w-full flex border-b border-border/30"
                    style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                  >
                    <div className="w-20 shrink-0 pr-3 text-right">
                      <span className="text-sm text-muted-foreground relative -top-2">
                        {hour === 0 ? "" : format(new Date().setHours(hour, 0), "h:mm a")}
                      </span>
                    </div>
                    <div
                      onDragOver={(e) => handleDragOver(e, cellId)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, currentDate, hour)}
                      onClick={() => {
                        const newDate = new Date(currentDate)
                        newDate.setHours(hour)
                        onCreateEntry?.(newDate)
                      }}
                      className={cn(
                        "flex-1 border-l border-border/30 cursor-pointer hover:bg-muted/20",
                        (isDraggingTask || draggingEntry) && "border-dashed",
                        isDropTargetCell && "bg-primary/20",
                      )}
                    />
                  </div>
                )
              })}

              {/* Events overlay */}
              <div className="absolute left-20 right-0 top-0 bottom-0 pointer-events-none">
                {timedEntries.map((entry) => {
                  const startTime = new Date(entry.createdAt)
                  const endTime = entry.endTime ? new Date(entry.endTime) : addMinutes(startTime, entry.duration || 60)

                  const startMinutes = getHours(startTime) * 60 + getMinutes(startTime)
                  const endMinutes = getHours(endTime) * 60 + getMinutes(endTime)
                  const durationMinutes = endMinutes - startMinutes

                  const top = (startMinutes / 60) * HOUR_HEIGHT
                  const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20)

                  const pos = positions.get(entry.id) || { column: 0, totalColumns: 1 }
                  const width = `calc(${100 / pos.totalColumns}% - 8px)`
                  const left = `calc(${(pos.column / pos.totalColumns) * 100}% + 4px)`

                  return (
                    <EventCard
                      key={entry.id}
                      entry={entry}
                      isCompact={durationMinutes < 45}
                      showResizeHandles={true} // Enable resize handles
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        left,
                        width,
                        pointerEvents: "auto",
                      }}
                    />
                  )
                })}
              </div>

              {/* Current time indicator */}
              {isToday(currentDate) && (
                <div
                  className="absolute left-20 right-0 flex items-center z-40 pointer-events-none"
                  style={{
                    top: `${((new Date().getHours() * 60 + new Date().getMinutes()) / 60) * HOUR_HEIGHT}px`,
                  }}
                >
                  <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5" />
                  <div className="flex-1 h-0.5 bg-red-500" />
                </div>
              )}
            </div>
          </div>

          {renderDayViewSidebar()}
        </div>
      </div>
    )
  }

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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">{getHeaderTitle()}</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate("prev")}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("next")}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
          {(["month", "week", "day"] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
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

      {/* Calendar content */}
      <div className="flex-1 p-6 flex flex-col overflow-hidden">
        {viewMode === "month" && renderMonthView()}
        {viewMode === "week" && renderWeekView()}
        {viewMode === "day" && renderDayView()}
      </div>

      {viewMode === "month" && selectedDate && (
        <div className="absolute right-0 top-0 h-full w-80 border-l border-border/50 bg-card/95 backdrop-blur-sm p-4 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">{format(selectedDate, "EEEE, MMMM d")}</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
              Close
            </Button>
          </div>
          {getEntriesForDate(selectedDate).length > 0 ? (
            <div className="space-y-2">
              {getEntriesForDate(selectedDate).map((entry) => {
                const entryColor = getEntryColor(entry)
                return (
                  <button
                    key={entry.id}
                    onClick={() => onSelectEntry(entry)}
                    style={entryColor.isGoalColor ? entryColor.style : {}}
                    className={cn(
                      "w-full rounded-lg p-3 text-left transition-all hover:opacity-80",
                      !entryColor.isGoalColor && entryColor.classes?.bg,
                      !entryColor.isGoalColor && entryColor.classes?.text,
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium flex-1">{entry.title}</h4>
                      {entryColor.isGoalColor && <Target className="h-4 w-4 opacity-75" />}
                    </div>
                    {!entry.isAllDay && (
                      <p className="text-sm opacity-75 mt-1">{format(new Date(entry.createdAt), "h:mm a")}</p>
                    )}
                    {entryColor.isGoalColor && entryColor.goalTitle && (
                      <p className="text-xs opacity-60 mt-1">Goal: {entryColor.goalTitle}</p>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No events for this day</p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent"
                onClick={() => onCreateEntry?.(selectedDate)}
              >
                <Plus className="h-4 w-4" />
                Add Event
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
