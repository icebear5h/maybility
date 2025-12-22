"use client"

import type React from "react"
import { useRef, useState, useMemo, useCallback, useEffect } from "react"
import type { Task, Event, Goal } from "@/lib/types"
import { cn } from "@/lib/utils"
import { format, isSameDay } from "date-fns"
import { Plus } from "lucide-react"

import { useTimelineState, type TimelineEventItem } from "./hooks/useTimelineState"
import { useTimelineDrag } from "./hooks/useTimelineDrag"
import { useTimelineResize } from "./hooks/useTimelineResize"
import { TimelineHeader } from "./timeline-header"
import { TimelineEvent } from "./timeline-event"

interface TimelineViewProps {
  events?: Event[]
  onSelectEvent?: (event: Event) => void
  onCreateEvent?: (date?: Date) => void
  onUpdateEvent?: (event: Event) => void
  isDraggingTask?: boolean
  onTaskDrop?: (task: Task, date: Date) => void
  goals?: Goal[]
}

export function TimelineView(props: TimelineViewProps) {
  const { events = [], onSelectEvent, onCreateEvent, onUpdateEvent, isDraggingTask = false, onTaskDrop } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hasCentered, setHasCentered] = useState(false)

  const {
    zoom,
    panOffset,
    setPanOffset,
    setCenterDate,
    displayDays,
    hoverTime,
    setHoverTime,
    timelineEvents,
    stackLevels,
    overlapInfo,
    handleZoom,
    navigateDay,
    expandLeft,
    expandRight,
    contractLeft,
    contractRight,
    daysBeforeCenter,
    daysAfterCenter,
  } = useTimelineState(events)

  const HOUR_WIDTH = 120 * zoom
  const DAY_WIDTH = 24 * HOUR_WIDTH
  const TOTAL_DAYS = displayDays.length
  const TIMELINE_Y = 500
  const ENTRY_HEIGHT = 40 * zoom
  const STACK_GAP = 8 * zoom // Gap between stacked events
  const STACK_OFFSET = ENTRY_HEIGHT + STACK_GAP // Full height + gap = no overlap

  const handleEventUpdate = useCallback(
    (updatedEvent: Event) => {
      if (!onUpdateEvent) return

      onUpdateEvent({
        ...updatedEvent,
        startTime:
          updatedEvent.startTime instanceof Date ? updatedEvent.startTime.toISOString() : updatedEvent.startTime,
        ...(updatedEvent.endTime
          ? {
              endTime: updatedEvent.endTime instanceof Date ? updatedEvent.endTime.toISOString() : updatedEvent.endTime,
            }
          : {}),
      })
    },
    [onUpdateEvent],
  )

  const { resizing, handleResizeStart } = useTimelineResize(timelineEvents, handleEventUpdate, HOUR_WIDTH)
  const { draggingEvent, handleEntryDragStart } = useTimelineDrag(
    timelineEvents,
    handleEventUpdate,
    HOUR_WIDTH,
    !!resizing,
  )

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (hasCentered || !containerRef.current) return
    const containerWidth = containerRef.current.clientWidth
    const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60
    const currentX = daysBeforeCenter * DAY_WIDTH + currentHour * HOUR_WIDTH + 60
    setPanOffset({ x: containerWidth / 2 - currentX, y: 0 })
    setHasCentered(true)
  }, [DAY_WIDTH, HOUR_WIDTH, currentTime, hasCentered, setPanOffset, daysBeforeCenter])

  const getXPosition = useCallback(
    (date: Date) => {
      const entryDay = new Date(date).setHours(0, 0, 0, 0)
      let dayIndex = displayDays.findIndex((d) => new Date(d).setHours(0, 0, 0, 0) === entryDay)

      if (dayIndex === -1) {
        dayIndex = date < displayDays[0] ? 0 : TOTAL_DAYS - 1
      }

      const hours = date.getHours()
      const minutes = date.getMinutes()
      return dayIndex * DAY_WIDTH + (hours + minutes / 60) * HOUR_WIDTH + 60
    },
    [displayDays, DAY_WIDTH, HOUR_WIDTH, TOTAL_DAYS],
  )

  const getBarWidth = useCallback(
    (event: TimelineEventItem) => {
      const start = new Date(event.startTime)
      const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 60 * 60 * 1000)
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      return Math.max(HOUR_WIDTH * 0.3, durationHours * HOUR_WIDTH)
    },
    [HOUR_WIDTH],
  )

  const currentTimeX = useMemo(() => {
    const now = currentTime
    let dayIndex = daysBeforeCenter // Default to center day
    const matchingDayIndex = displayDays.findIndex((d) => isSameDay(d, now))
    if (matchingDayIndex !== -1) dayIndex = matchingDayIndex

    const hours = now.getHours()
    const minutes = now.getMinutes()
    return dayIndex * DAY_WIDTH + (hours + minutes / 60) * HOUR_WIDTH + 60
  }, [currentTime, HOUR_WIDTH, DAY_WIDTH, displayDays, daysBeforeCenter])

  const isCurrentTimeVisible = useMemo(
    () => displayDays.some((d) => isSameDay(d, currentTime)),
    [currentTime, displayDays],
  )

  const jumpToNow = useCallback(() => {
    if (!containerRef.current) return
    setCenterDate(new Date())
    const containerWidth = containerRef.current.clientWidth
    const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60
    const nowX = daysBeforeCenter * DAY_WIDTH + currentHour * HOUR_WIDTH + 60
    setPanOffset({ x: containerWidth / 2 - nowX, y: panOffset.y })
  }, [currentTime, DAY_WIDTH, HOUR_WIDTH, panOffset.y, setCenterDate, setPanOffset, daysBeforeCenter])

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
  }, [HOUR_WIDTH, DAY_WIDTH, TOTAL_DAYS])

  const canvasWidth = TOTAL_DAYS * DAY_WIDTH + 200
  const canvasHeight = 700

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

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (resizing || draggingEvent) return
    setIsDragging(true)
    setDragStart({ x: event.clientX - panOffset.x, y: event.clientY - panOffset.y })
  }

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (isDragging && containerRef.current) {
        const deltaX = event.clientX - dragStart.x
        const deltaY = event.clientY - dragStart.y
        setPanOffset({ x: deltaX, y: deltaY })
        setHoverTime(null)
      } else if (!resizing && !draggingEvent) {
        const time = getTimeFromX(event.clientX)
        if (time) {
          const rect = containerRef.current?.getBoundingClientRect()
          if (rect) {
            setHoverTime({ x: event.clientX - rect.left, date: time })
          }
        } else {
          setHoverTime(null)
        }
      }
    },
    [isDragging, dragStart, resizing, draggingEvent, getTimeFromX, setPanOffset, setHoverTime],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    // Drag/resize lifecycle is handled by window listeners inside hooks to avoid duplicate updates
  }, [])

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (resizing || draggingEvent) return
      const time = getTimeFromX(event.clientX)
      if (time) {
        onCreateEvent?.(time)
      }
    },
    [getTimeFromX, onCreateEvent, resizing, draggingEvent],
  )

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const hasDroppableData =
        event.dataTransfer.types.includes("application/json") || event.dataTransfer.types.includes("application/event")
      if (!hasDroppableData) return

      event.preventDefault()
      const time = getTimeFromX(event.clientX)
      if (time && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setHoverTime({ x: event.clientX - rect.left, date: time })
      }
    },
    [getTimeFromX, setHoverTime],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setHoverTime(null)
      const dropTime = getTimeFromX(event.clientX)
      if (!dropTime) return

      const eventData = event.dataTransfer.getData("application/event")
      if (eventData && onUpdateEvent) {
        try {
          const draggedEvent = JSON.parse(eventData) as Event
          if (draggedEvent.startTime == null) {
            console.warn("Dropped event has no start time; ignoring move")
            return
          }
          const originalStart = new Date(draggedEvent.startTime)
          const originalEnd = draggedEvent.endTime ? new Date(draggedEvent.endTime) : null
          let newEndTime: string | undefined

          if (originalEnd) {
            const duration = originalEnd.getTime() - originalStart.getTime()
            newEndTime = new Date(dropTime.getTime() + duration).toISOString()
          }

          onUpdateEvent({
            ...draggedEvent,
            startTime: dropTime.toISOString(),
            ...(newEndTime ? { endTime: newEndTime } : {}),
          })
          return
        } catch (error) {
          console.error("Failed to parse dropped event:", error)
        }
      }

      const taskData = event.dataTransfer.getData("application/json")
      if (taskData && onTaskDrop) {
        try {
          const task = JSON.parse(taskData) as Task
          onTaskDrop(task, dropTime)
        } catch (error) {
          console.error("Failed to parse dropped task:", error)
        }
      }
    },
    [getTimeFromX, onTaskDrop, onUpdateEvent, setHoverTime],
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TimelineHeader
        displayDays={displayDays}
        zoom={zoom}
        onZoom={handleZoom}
        onNavigate={navigateDay}
        onJumpToNow={jumpToNow}
        onExpandLeft={expandLeft}
        onExpandRight={expandRight}
        onContractLeft={contractLeft}
        onContractRight={contractRight}
        daysBeforeCenter={daysBeforeCenter}
        daysAfterCenter={daysAfterCenter}
      />

      <div
        ref={containerRef}
        className={cn(
          "flex-1 overflow-hidden bg-background",
          resizing
            ? "cursor-ew-resize"
            : draggingEvent
              ? "cursor-grabbing"
              : isDragging
                ? "cursor-grabbing"
                : "cursor-grab",
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (!resizing && !draggingEvent) {
            handleMouseUp()
          }
          setHoverTime(null)
        }}
        onDoubleClick={handleDoubleClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div
          className="relative h-full"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            width: canvasWidth,
            height: canvasHeight,
          }}
        >
          <svg className="absolute inset-0" width={canvasWidth} height={canvasHeight} style={{ overflow: "visible" }}>
            <line
              x1={0}
              y1={TIMELINE_Y}
              x2={canvasWidth}
              y2={TIMELINE_Y}
              stroke="currentColor"
              strokeWidth={2}
              className="text-foreground/70"
            />
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
          </svg>

          {timelineEvents.map((event, index) => {
            const isBeingResized = resizing?.eventId === event.id
            const isBeingDragged = draggingEvent?.eventId === event.id

            // Calculate preview position based on drag or resize state
            let previewStart: Date
            let previewEnd: Date | string | null | undefined

            if (isBeingDragged && draggingEvent?.currentStart) {
              previewStart = draggingEvent.currentStart
              previewEnd = draggingEvent.currentEnd
            } else if (isBeingResized && resizing?.currentStart) {
              previewStart = resizing.currentStart
              previewEnd = resizing.currentEnd
            } else {
              previewStart = new Date(event.startTime ?? event.createdAt)
              previewEnd = event.endTime
            }

            const x = getXPosition(previewStart)
            const width = getBarWidth({
              ...event,
              startTime: previewStart,
              endTime: previewEnd ?? event.endTime,
            })
            const stackLevel = stackLevels[index] || 0
            const y = TIMELINE_Y - 100 - stackLevel * STACK_OFFSET

            const eventForDisplay = {
              ...event,
              startTime: previewStart,
              endTime: previewEnd ?? event.endTime,
            }

            return (
              <TimelineEvent
                key={`${event.id}-${index}`}
                entry={eventForDisplay}
                x={x}
                y={y}
                width={width}
                height={ENTRY_HEIGHT}
                zoom={zoom}
                isBeingDragged={isBeingDragged}
                isBeingResized={isBeingResized}
                overlapInfo={overlapInfo[index]}
                stackLevel={stackLevel}
                totalEventCount={timelineEvents.length}
                onResizeStart={handleResizeStart}
                onDragStart={handleEntryDragStart}
                onClick={() => {
                  if (!resizing && !draggingEvent) {
                    onSelectEvent?.(event)
                  }
                }}
              />
            )
          })}

          {hoverTime && !isDragging && !resizing && !draggingEvent && (
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
              <div className="mt-1 text-xs text-muted-foreground">
                {isDraggingTask ? "Release to drop task" : "Double-click to add"}
              </div>
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
