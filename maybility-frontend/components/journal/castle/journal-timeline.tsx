"use client"

import { useRef, useState, useMemo, useEffect, useCallback } from "react"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, isSameDay, getDay } from "date-fns"
import type { Node } from "@/lib/types"

interface JournalTimelineProps {
  onSelectJournal: (node: Node) => void
  nodes?: Node[] // Existing journal nodes from file system
}

interface TimelineEntry {
  id: string
  type: "daily" | "weekly" | "monthly"
  title: string
  subtitle: string
  date: Date
  node?: Node // Linked file system node if exists
  isPlaceholder: boolean
}

interface CanvasEntry {
  entry: TimelineEntry
  x: number
  y: number
  width: number
  height: number
}

// Layout constants
const PADDING = 40
const LEFT_MARGIN = 80
const CARD_WIDTH = 340
const DAILY_CARD_HEIGHT = 52
const WEEKLY_CARD_HEIGHT = 64
const MONTHLY_CARD_HEIGHT = 72
const CARD_GAP = 8
const WEEK_GAP = 20

// Generate interleaved timeline: D D D D D D D [W] D D D D D D D [W] ... [M]
function generateTimeline(weeks: number = 8): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  const today = new Date()
  let weekCount = 0

  for (let w = 0; w < weeks; w++) {
    // Add 7 daily entries for this week (most recent first within week, but weeks go back in time)
    const weekStartOffset = w * 7

    for (let d = 0; d < 7; d++) {
      const dayOffset = weekStartOffset + d
      const date = subDays(today, dayOffset)
      const dayOfWeek = getDay(date) // 0 = Sunday
      const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

      const isToday = isSameDay(date, today)
      const isYesterday = isSameDay(date, subDays(today, 1))

      let title = dayLabels[dayOfWeek]
      if (isToday) title = "Today"
      else if (isYesterday) title = "Yesterday"

      entries.push({
        id: `daily-${format(date, "yyyy-MM-dd")}`,
        type: "daily",
        title,
        subtitle: format(date, "EEEE, MMM d"),
        date,
        isPlaceholder: true,
      })
    }

    // Add weekly review after every 7 days
    weekCount++
    const weekEnd = subDays(today, weekStartOffset)
    const weekStart = subDays(weekEnd, 6)

    entries.push({
      id: `weekly-${format(weekStart, "yyyy-MM-dd")}`,
      type: "weekly",
      title: w === 0 ? "This Week's Review" : `Week ${weekCount} Review`,
      subtitle: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`,
      date: weekEnd,
      isPlaceholder: true,
    })

    // Add monthly review after every 4 weeks
    if (weekCount % 4 === 0) {
      const monthDate = startOfMonth(weekEnd)
      entries.push({
        id: `monthly-${format(monthDate, "yyyy-MM")}`,
        type: "monthly",
        title: `${format(monthDate, "MMMM")} Review`,
        subtitle: format(monthDate, "MMMM yyyy"),
        date: monthDate,
        isPlaceholder: true,
      })
    }
  }

  return entries
}

export function JournalTimeline({ onSelectJournal, nodes = [] }: JournalTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const entriesRef = useRef<Map<string, CanvasEntry>>(new Map())

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const lastMousePosRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)

  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panRef.current = pan }, [pan])

  // Generate timeline entries and match with existing nodes
  const timelineEntries = useMemo(() => {
    const entries = generateTimeline(8) // 8 weeks of history

    // Match entries with existing file system nodes
    // Node names could be like "2024-01-15" or "Week of Jan 15" etc.
    nodes.forEach((node) => {
      // Try to match by date in node name
      const dateMatch = node.name.match(/(\d{4}-\d{2}-\d{2})/)
      if (dateMatch) {
        const entry = entries.find((e) => e.id.includes(dateMatch[1]))
        if (entry) {
          entry.node = node
          entry.isPlaceholder = false
        }
      }
    })

    return entries
  }, [nodes])

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect()
      if (rect.width < 100 || rect.height < 100) return

      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }

    const resizeObserver = new ResizeObserver(() => resizeCanvas())
    resizeObserver.observe(container)
    resizeCanvas()

    // Initialize entry positions
    const initializeEntries = () => {
      entriesRef.current.clear()

      const dpr = window.devicePixelRatio || 1
      const cardX = LEFT_MARGIN

      let currentY = PADDING + 80 // Clear header
      let lastType: "daily" | "weekly" | "monthly" = "daily"

      timelineEntries.forEach((entry) => {
        // Add extra gap before weekly/monthly reviews
        if (entry.type !== "daily" && lastType === "daily") {
          currentY += WEEK_GAP
        }

        const height = entry.type === "daily"
          ? DAILY_CARD_HEIGHT
          : entry.type === "weekly"
            ? WEEKLY_CARD_HEIGHT
            : MONTHLY_CARD_HEIGHT

        entriesRef.current.set(entry.id, {
          entry,
          x: cardX,
          y: currentY,
          width: CARD_WIDTH,
          height,
        })

        currentY += height + CARD_GAP

        // Add extra gap after weekly/monthly reviews
        if (entry.type !== "daily") {
          currentY += WEEK_GAP
        }

        lastType = entry.type
      })
    }

    initializeEntries()

    const animate = () => {
      const dpr = window.devicePixelRatio || 1
      const width = canvas.width / dpr
      const height = canvas.height / dpr

      // Background
      ctx.fillStyle = "#09090b"
      ctx.fillRect(0, 0, width, height)

      ctx.save()
      ctx.translate(panRef.current.x + width / 2, panRef.current.y + height / 2)
      ctx.scale(zoomRef.current, zoomRef.current)
      ctx.translate(-width / 2, -height / 2)

      // Dot grid
      const gridSize = 25
      ctx.fillStyle = "#27272a"
      for (let x = gridSize; x < width * 2; x += gridSize) {
        for (let y = gridSize; y < height * 2; y += gridSize) {
          ctx.beginPath()
          ctx.arc(x, y, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Draw timeline line
      const allEntries = Array.from(entriesRef.current.values())
      if (allEntries.length > 0) {
        const firstEntry = allEntries[0]
        const lastEntry = allEntries[allEntries.length - 1]

        ctx.strokeStyle = "#27272a"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(LEFT_MARGIN - 25, firstEntry.y)
        ctx.lineTo(LEFT_MARGIN - 25, lastEntry.y + lastEntry.height)
        ctx.stroke()
      }

      // Draw entries
      entriesRef.current.forEach((canvasEntry) => {
        const { entry, x, y, width: cardWidth, height: cardHeight } = canvasEntry
        const isHovered = hoveredId === entry.id
        const isSelected = selectedId === entry.id

        // Timeline dot
        const dotRadius = entry.type === "daily" ? 6 : entry.type === "weekly" ? 8 : 10
        const dotColor = entry.type === "daily"
          ? "#10b981"
          : entry.type === "weekly"
            ? "#3b82f6"
            : "#8b5cf6"

        ctx.beginPath()
        ctx.arc(LEFT_MARGIN - 25, y + cardHeight / 2, dotRadius, 0, Math.PI * 2)
        ctx.fillStyle = entry.isPlaceholder ? "#3f3f46" : dotColor
        ctx.fill()

        // Card background
        ctx.beginPath()
        ctx.roundRect(x, y, cardWidth, cardHeight, 8)

        if (isSelected) {
          ctx.fillStyle = "#27272a"
          ctx.strokeStyle = dotColor
          ctx.lineWidth = 2
          ctx.fill()
          ctx.stroke()
        } else if (isHovered) {
          ctx.fillStyle = "#1f1f23"
          ctx.fill()
        } else {
          ctx.fillStyle = entry.isPlaceholder ? "#0f0f12" : "#18181b"
          ctx.fill()
        }

        // Left accent bar for non-daily entries
        if (entry.type !== "daily") {
          ctx.beginPath()
          ctx.roundRect(x, y, 4, cardHeight, [8, 0, 0, 8])
          ctx.fillStyle = dotColor
          ctx.fill()
        }

        // Title
        ctx.fillStyle = entry.isPlaceholder ? "#71717a" : "#fafafa"
        ctx.font = entry.type === "daily" ? "500 14px system-ui" : "600 15px system-ui"
        ctx.textAlign = "left"
        ctx.textBaseline = "middle"

        const textX = entry.type === "daily" ? x + 16 : x + 20
        ctx.fillText(entry.title, textX, y + cardHeight / 2 - (entry.type === "daily" ? 0 : 8))

        // Subtitle
        if (entry.type !== "daily" || !entry.isPlaceholder) {
          ctx.fillStyle = "#71717a"
          ctx.font = "12px system-ui"
          ctx.fillText(entry.subtitle, textX, y + cardHeight / 2 + (entry.type === "daily" ? 14 : 10))
        } else {
          // For daily placeholders, show subtitle on same line
          ctx.fillStyle = "#52525b"
          ctx.font = "12px system-ui"
          const titleWidth = ctx.measureText(entry.title).width
          ctx.fillText(entry.subtitle, textX + titleWidth + 12, y + cardHeight / 2)
        }

        // Status indicator
        if (!entry.isPlaceholder) {
          ctx.fillStyle = "#10b981"
          ctx.beginPath()
          ctx.arc(x + cardWidth - 20, y + cardHeight / 2, 4, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // Plus icon for placeholders
          ctx.fillStyle = "#52525b"
          ctx.font = "16px system-ui"
          ctx.textAlign = "center"
          ctx.fillText("+", x + cardWidth - 20, y + cardHeight / 2 + 1)
        }
      })

      ctx.restore()

      // Header bar
      ctx.fillStyle = "#18181b"
      ctx.fillRect(0, 0, width, 50)
      ctx.strokeStyle = "#27272a"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, 50)
      ctx.lineTo(width, 50)
      ctx.stroke()

      ctx.fillStyle = "#fff"
      ctx.font = "bold 18px system-ui"
      ctx.textAlign = "left"
      ctx.textBaseline = "middle"
      ctx.fillText("Journal", 24, 25)

      ctx.fillStyle = "#71717a"
      ctx.font = "13px system-ui"
      ctx.textAlign = "center"
      ctx.fillText("Daily reflections & periodic reviews", width / 2, 25)
      ctx.textAlign = "left"

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      resizeObserver.disconnect()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [timelineEntries, selectedId, hoveredId])

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const x = (e.clientX - rect.left - panRef.current.x - width / 2) / zoomRef.current + width / 2
    const y = (e.clientY - rect.top - panRef.current.y - height / 2) / zoomRef.current + height / 2
    return { x, y }
  }

  const findEntryAt = useCallback((x: number, y: number): CanvasEntry | null => {
    for (const [, entry] of entriesRef.current) {
      if (
        x >= entry.x &&
        x <= entry.x + entry.width &&
        y >= entry.y &&
        y <= entry.y + entry.height
      ) {
        return entry
      }
    }
    return null
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e)
    const canvasEntry = findEntryAt(pos.x, pos.y)

    if (canvasEntry) {
      setSelectedId(canvasEntry.entry.id)

      // Open the entry on single click
      const { entry } = canvasEntry
      if (entry.node) {
        onSelectJournal(entry.node)
      } else {
        // Create new journal node
        const newNode: Node = {
          id: entry.id,
          type: "file",
          name: `${entry.title} - ${entry.subtitle}`,
          description: entry.type === "daily"
            ? "Daily journal entry"
            : entry.type === "weekly"
              ? "Weekly reflection"
              : "Monthly review",
          content: "",
          parentIds: [],
          createdAt: entry.date,
          updatedAt: new Date(),
        }
        onSelectJournal(newNode)
      }
    } else {
      setIsPanning(true)
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePosRef.current.x
      const dy = e.clientY - lastMousePosRef.current.y
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
    } else {
      const pos = getMousePos(e)
      const entry = findEntryAt(pos.x, pos.y)
      setHoveredId(entry?.entry.id || null)
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    const pos = getMousePos(e)
    const canvasEntry = findEntryAt(pos.x, pos.y)

    if (canvasEntry) {
      const { entry } = canvasEntry

      // If linked to existing node, open it
      if (entry.node) {
        onSelectJournal(entry.node)
      } else {
        // Create new journal node
        const newNode: Node = {
          id: entry.id,
          type: "file",
          name: `${entry.title} - ${entry.subtitle}`,
          description: entry.type === "daily"
            ? "Daily journal entry"
            : entry.type === "weekly"
              ? "Weekly reflection"
              : "Monthly review",
          content: "",
          parentIds: [],
          createdAt: entry.date,
          updatedAt: new Date(),
        }
        onSelectJournal(newNode)
      }
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setZoom((prev) => Math.max(0.5, Math.min(2, prev * delta)))
    } else {
      setPan((prev) => ({ x: prev.x, y: prev.y - e.deltaY }))
    }
  }

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
    </div>
  )
}
