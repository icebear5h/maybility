// useCalendarDrag.ts
import { useCallback, useState } from "react"
import {
  useDndMonitor,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from "@dnd-kit/core"

import { Occurrence, DragState, DragAction, DragEntity } from "@/types/calendar-types"
import { Task } from "@/types/task-types"



// ── Helpers ────────────────────────────────────────────────────────────────────
const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

// LOCAL calendar date (YYYY-MM-DD) from ISO
const getLocalDateFromUtc = (utc: string): string => {
  const d = new Date(utc)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

// "HH:MM" from ISO (local time fields)
const getTimeFromUtc = (utc: string): string =>
  new Date(utc).toTimeString().slice(0, 5)

// ISO from local date+time
const buildIsoFromLocal = (date: string, time: string): string =>
  new Date(`${date}T${time}:00`).toISOString()

const VIEW_BEHAVIOR = {
  month: { allowDayChange: true, allowTimeChange: false },
  week: { allowDayChange: true, allowTimeChange: true },
  day: { allowDayChange: false, allowTimeChange: true },
} as const

type ViewMode = "day" | "week" | "month"

interface UseCalendarDragProps {
  events: Occurrence[]
  setEvents: React.Dispatch<React.SetStateAction<Occurrence[]>>
  containerRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>
  onUpdateTask: (id: string, updates: Partial<Task>) => void
  currentView?: ViewMode
}

/**
 * DnD-only calendar drag logic:
 * - Uses dnd-kit useDndMonitor to receive onDragStart/Move/End.
 * - Maintains dragState.new* live for preview and commits on dragEnd.
 * - Supports dropping todos onto day columns (droppable id="YYYY-MM-DD").
 */
export function useCalendarDrag({
  events,
  setEvents,
  containerRefs,
  onUpdateTask,
  currentView = "month",
}: UseCalendarDragProps) {
  const behavior = VIEW_BEHAVIOR[currentView]

  const [dragState, setDragState] = useState<DragState>({
    eventId: null,
    action: null,
    entity: null,
    startY: 0,
    startX: 0,
    containerHeight: 0,
    originalStartUtc: "",
    originalEndUtc: "",
    originalDate: "",
    newStartUtc: "",
    newEndUtc: "",
    newDate: "",
  })
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null) // helpful for DragOverlay, if you want it

  // ── onDragStart ──────────────────────────────────────────────────────────────
  const onDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active?.id ?? ""))

    const data = e.active.data?.current

    // Existing calendar event
    if (data?.kind === "event") {
      const id = String(e.active.id)
      const ev = events.find((x) => x.id === id)
      if (!ev) return

      const originalDate = getLocalDateFromUtc(ev.startUtc)
      const container = containerRefs.current[originalDate]
      const containerHeight =
        container?.getBoundingClientRect().height ?? 1440 // fallback

      setDragState({
        eventId: id,
        action: "move",
        entity: "event",
        startY: 0,
        startX: 0,
        containerHeight,
        originalStartUtc: ev.startUtc,
        originalEndUtc: ev.endUtc,
        originalDate,
        newStartUtc: ev.startUtc,
        newEndUtc: ev.endUtc,
        newDate: originalDate,
      })
      setDragOverDate(originalDate)
      return
    }

    // Dragging from a TODO source — we don’t set dragState here; we’ll handle onEnd
  }, [events, containerRefs])

  // ── onDragMove (live preview into new*) ─────────────────────────────────────
  const onDragMove = useCallback((e: DragMoveEvent) => {
    if (!dragState.eventId) return

    // Identify the day under pointer (your day columns should have droppable id="YYYY-MM-DD")
    const hoveredDate = e.over?.id ? String(e.over.id) : dragState.originalDate
    setDragOverDate(hoveredDate)

    // Month view: only change the day; time stays the same
    if (!behavior.allowTimeChange) {
      const startT = getTimeFromUtc(dragState.originalStartUtc)
      const endT = getTimeFromUtc(dragState.originalEndUtc)
      const nextDate = behavior.allowDayChange ? hoveredDate : dragState.originalDate

      setDragState((s) => ({
        ...s,
        newDate: nextDate,
        newStartUtc: buildIsoFromLocal(nextDate, startT),
        newEndUtc: buildIsoFromLocal(nextDate, endT),
      }))
      return
    }

    // Week/Day: compute minutes from vertical delta
    const minutesPerPixel = (24 * 60) / (dragState.containerHeight || 1440)
    const deltaM = Math.round((e.delta.y * minutesPerPixel) / 5) * 5

    const origStartT = getTimeFromUtc(dragState.originalStartUtc)
    const origEndT = getTimeFromUtc(dragState.originalEndUtc)
    const s0 = timeToMinutes(origStartT)
    const e0 = timeToMinutes(origEndT)
    const dur = e0 - s0

    let s1 = Math.max(0, Math.min(23 * 60 + 55, s0 + deltaM))
    let e1 = Math.min(24 * 60, s1 + dur)

    const newStart = minutesToTime(s1)
    const newEnd = minutesToTime(e1)
    const nextDate = behavior.allowDayChange ? hoveredDate : dragState.originalDate

    setDragState((s) => ({
      ...s,
      newDate: nextDate,
      newStartUtc: buildIsoFromLocal(nextDate, newStart),
      newEndUtc: buildIsoFromLocal(nextDate, newEnd),
    }))
  }, [dragState.eventId, dragState.containerHeight, dragState.originalStartUtc, dragState.originalEndUtc, dragState.originalDate, behavior.allowDayChange, behavior.allowTimeChange])

  // ── onDragEnd (commit new* or create from TODO) ─────────────────────────────
  const onDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e
    setActiveId(null)

    // No drop target
    if (!over) {
      // reset drag state and exit
      setDragState({
        eventId: null,
        action: null,
        entity: null,
        startY: 0,
        startX: 0,
        containerHeight: 0,
        originalStartUtc: "",
        originalEndUtc: "",
        originalDate: "",
        newStartUtc: "",
        newEndUtc: "",
        newDate: "",
      })
      setDragOverDate(null)
      return
    }

    const overDate = String(over.id)
    const data = active.data?.current

    // 1) TODO → calendar
    if (data?.kind === "todo") {
      const todo = data.todo as Task

      // De-dupe on local day
      const exists = events.find(
        (ev) => ev.taskId === todo.id && getLocalDateFromUtc(ev.startUtc) === overDate
      )
      if (exists) {
        setDragOverDate(null)
        return
      }

      // Optional: if your day cell writes data-drop-y/container-height for precise time
      let startTime = "09:00"
      let endTime = "10:00"
      const dropEl = document.querySelector(`[data-date="${overDate}"]`) as HTMLElement | null
      if (dropEl) {
        const dropY = dropEl.getAttribute("data-drop-y")
        const ch = dropEl.getAttribute("data-container-height")
        if (dropY && ch) {
          const total = 24 * 60
          const clicked = Math.floor((parseFloat(dropY) / parseFloat(ch)) * total)
          const snapped = Math.round(clicked / 5) * 5
          const h = Math.floor(snapped / 60)
          const m = snapped % 60
          startTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
          const dur = todo.estimatedDuration ?? 60
          const endM = Math.min(24 * 60, snapped + dur)
          const eh = Math.floor(endM / 60)
          const em = endM % 60
          endTime = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`
          dropEl.removeAttribute("data-drop-y")
          dropEl.removeAttribute("data-container-height")
        }
      }

      const newEvent: Occurrence = {
        id: `event-${Date.now()}`,
        taskId: todo.id,
        title: todo.title,
        description: todo.description || "",
        startUtc: buildIsoFromLocal(overDate, startTime),
        endUtc: buildIsoFromLocal(overDate, endTime),
        color: todo.color || "#10b981",
        status: todo.status,
        source: "SINGLE",
        isRecurring: false,
        hasOverride: false,
      }

      setEvents((prev) => [...prev, newEvent])
      onUpdateTask(todo.id, { scheduledDate: new Date(overDate) })
      setDragOverDate(null)
      return
    }

    // 2) Existing event move: commit from new* (single source of truth)
    if (dragState.eventId) {
      const { newDate, newStartUtc, newEndUtc } = dragState

      // If no move happened (e.g., missing onDragMove), fall back to original date
      const commitDate = newDate || dragState.originalDate
      const commitStart = newStartUtc || dragState.originalStartUtc
      const commitEnd = newEndUtc || dragState.originalEndUtc

      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === dragState.eventId
            ? { ...ev, startUtc: commitStart, endUtc: commitEnd }
            : ev
        )
      )

      const moved = events.find((ev) => ev.id === dragState.eventId)
      if (moved?.taskId) {
        const s = getTimeFromUtc(commitStart)
        const t = getTimeFromUtc(commitEnd)
        const duration = Math.max(5, timeToMinutes(t) - timeToMinutes(s))
        onUpdateTask(moved.taskId, {
          scheduledDate: new Date(commitDate),
          estimatedDuration: duration,
        })
      }
    }

    // Reset
    setDragState({
      eventId: null,
      action: null,
      entity: null,
      startY: 0,
      startX: 0,
      containerHeight: 0,
      originalStartUtc: "",
      originalEndUtc: "",
      originalDate: "",
      newStartUtc: "",
      newEndUtc: "",
      newDate: "",
    })
    setDragOverDate(null)
  }, [dragState, events, onUpdateTask, setEvents])



  return {
    // expose whatever your UI needs
    dragState,       // includes live newStartUtc/newEndUtc/newDate
    dragOverDate,    // for column highlight if desired
    activeId,        // for DragOverlay (clone the card while dragging)
    onDragStart,
    onDragMove,
    onDragEnd,
  }
}
