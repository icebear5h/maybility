import { isSameDay, isBefore, isAfter, startOfDay } from "date-fns"
import type { Event } from "./types"

export const EVENT_COLORS = [
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

export const getEventColorClasses = (colorName?: string) => {
  const color = EVENT_COLORS.find((c) => c.name.toLowerCase() === colorName?.toLowerCase()) || EVENT_COLORS[4]
  return color
}

export const getColorFromHex = (hex: string) => {
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return {
    hex,
    text: luminance > 0.5 ? "#1f2937" : "#ffffff",
    isLight: luminance > 0.5,
  }
}

export const entryOccursOnDate = (event: Event, date: Date): boolean => {
  if (!event.startTime) return false
  const eventDate = new Date(event.startTime)

  if (isSameDay(eventDate, date)) return true

  if (!event.rrule) return false

  // Parse RRULE string - simplified check
  const rule = event.rrule

  if (isBefore(date, startOfDay(eventDate))) return false

  // Simple RRULE parsing - check if rule contains DAILY, WEEKLY, MONTHLY, YEARLY
  const daysDiff = Math.floor((date.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24))

  if (rule.includes("DAILY")) {
    const intervalMatch = rule.match(/INTERVAL=(\d+)/)
    const interval = intervalMatch ? parseInt(intervalMatch[1]) : 1
    return daysDiff % interval === 0
  }
  if (rule.includes("WEEKLY")) {
    const intervalMatch = rule.match(/INTERVAL=(\d+)/)
    const interval = intervalMatch ? parseInt(intervalMatch[1]) : 1
    return daysDiff % (interval * 7) === 0
  }
  if (rule.includes("MONTHLY")) {
    return eventDate.getDate() === date.getDate()
  }
  if (rule.includes("YEARLY")) {
    return eventDate.getDate() === date.getDate() && eventDate.getMonth() === date.getMonth()
  }

  return false
}

export const calculateEventColumns = (events: Event[]): Map<string, { column: number; totalColumns: number }> => {
  const positions = new Map<string, { column: number; totalColumns: number }>()

  if (events.length === 0) return positions

  const getTimeRange = (event: Event) => {
    const start = event.startTime ? new Date(event.startTime).getTime() : Date.now()
    const end = event.endTime ? new Date(event.endTime).getTime() : start + 60 * 60 * 1000
    return { start, end }
  }

  const eventsOverlap = (a: Event, b: Event) => {
    const aRange = getTimeRange(a)
    const bRange = getTimeRange(b)
    return aRange.start < bRange.end && aRange.end > bRange.start
  }

  const groups: Event[][] = []
  const assigned = new Set<string>()

  events.forEach((event) => {
    if (assigned.has(event.id)) return

    const group: Event[] = [event]
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

  groups.forEach((group) => {
    if (group.length === 1) {
      positions.set(group[0].id, { column: 0, totalColumns: 1 })
      return
    }

    const sorted = [...group].sort((a, b) => {
      const aStart = a.startTime ? new Date(a.startTime).getTime() : 0
      const bStart = b.startTime ? new Date(b.startTime).getTime() : 0
      return aStart - bStart
    })

    const columns: Event[][] = []

    sorted.forEach((evt) => {
      const eventRange = getTimeRange(evt)

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
      columns[columnIndex].push(evt)
    })

    sorted.forEach((evt) => {
      for (let i = 0; i < columns.length; i++) {
        if (columns[i].includes(evt)) {
          positions.set(evt.id, { column: i, totalColumns: columns.length })
          break
        }
      }
    })
  })

  return positions
}
