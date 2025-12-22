import { useState, useMemo, useCallback } from "react"
import { addDays, startOfDay, endOfDay } from "date-fns"
import type { Event } from "@/lib/types"

type ScheduledEvent = Event & { startTime: NonNullable<Event["startTime"]> }
export type TimelineEventItem = ScheduledEvent

export interface OverlapInfo {
  overlappingIds: string[]
  overlapCount: number
  isConflicted: boolean
}

export function useTimelineState(events: Event[]) {
  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [centerDate, setCenterDate] = useState(new Date())
  const [hoverTime, setHoverTime] = useState<{ x: number; date: Date } | null>(null)
  const [daysBeforeCenter, setDaysBeforeCenter] = useState(1)
  const [daysAfterCenter, setDaysAfterCenter] = useState(1)

  const displayDays = useMemo(() => {
    const days: Date[] = []
    for (let i = -daysBeforeCenter; i <= daysAfterCenter; i++) {
      days.push(addDays(startOfDay(centerDate), i))
    }
    return days
  }, [centerDate, daysBeforeCenter, daysAfterCenter])

  // Filter events to visible range
  const timelineEvents = useMemo<TimelineEventItem[]>(() => {
    if (displayDays.length === 0) return []
    const rangeStart = startOfDay(displayDays[0])
    const rangeEnd = endOfDay(displayDays[displayDays.length - 1])

    return events
      .filter((e): e is ScheduledEvent => {
        if (!e.startTime) return false
        const start = new Date(e.startTime)
        return start >= rangeStart && start <= rangeEnd
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }, [events, displayDays])

  // Calculate stack levels - simple greedy algorithm
  const { stackLevels, overlapInfo } = useMemo(() => {
    const levels: Record<number, number> = {}
    const info: Record<number, OverlapInfo> = {}

    // For each event, track which "lanes" are occupied at each time
    const getEnd = (e: ScheduledEvent) => {
      if (e.endTime) return new Date(e.endTime).getTime()
      return new Date(e.startTime).getTime() + 3600000 // 1 hour default
    }

    for (let i = 0; i < timelineEvents.length; i++) {
      const event = timelineEvents[i]
      const start = new Date(event.startTime).getTime()
      const end = getEnd(event)

      // Find overlapping previous events and their levels
      const occupiedLevels = new Set<number>()
      const overlappingIds: string[] = []

      for (let j = 0; j < i; j++) {
        const other = timelineEvents[j]
        const otherStart = new Date(other.startTime).getTime()
        const otherEnd = getEnd(other)

        // Check overlap: events overlap if one starts before the other ends
        if (start < otherEnd && end > otherStart) {
          occupiedLevels.add(levels[j])
          overlappingIds.push(other.id)
        }
      }

      // Find first available level
      let level = 0
      while (occupiedLevels.has(level)) level++
      levels[i] = level

      info[i] = {
        overlappingIds,
        overlapCount: overlappingIds.length,
        isConflicted: overlappingIds.length >= 2,
      }
    }

    return { stackLevels: levels, overlapInfo: info }
  }, [timelineEvents])

  const handleZoom = useCallback((delta: number) => {
    setZoom(z => Math.max(0.3, Math.min(3, z + delta)))
  }, [])

  const navigateDay = useCallback((dir: number) => {
    setCenterDate(d => addDays(d, dir))
  }, [])

  const expandLeft = useCallback(() => setDaysBeforeCenter(d => d + 1), [])
  const expandRight = useCallback(() => setDaysAfterCenter(d => d + 1), [])
  const contractLeft = useCallback(() => setDaysBeforeCenter(d => Math.max(0, d - 1)), [])
  const contractRight = useCallback(() => setDaysAfterCenter(d => Math.max(0, d - 1)), [])

  return {
    zoom,
    setZoom,
    panOffset,
    setPanOffset,
    centerDate,
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
  }
}
