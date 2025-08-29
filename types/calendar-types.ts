import type { Task } from "@prisma/client"

export type ViewType = "month" | "week" | "day"
export type DragType = "move" | "resize-start" | "resize-end" | null
export type OccurrenceSource = "SINGLE" | "RRULE" | "RDATE" | "OVERRIDE_MOVED";

export interface Occurrence {
  id: string;          // stable instance id, e.g. `${taskId}:${startUtc}`
  taskId: string;
  title: string;
  description: string;
  startUtc: string;    // ISO
  endUtc: string;      // ISO
  color?: string;
  status?: Task["status"];
  source: OccurrenceSource;

  // helpful flags for editing
  isRecurring: boolean;
  hasOverride?: boolean;
}

export interface DragState {
  eventId: string | null // Occurrence.id
  type: "move" | "resize-start" | "resize-end" | null
  startY: number
  startX: number
  containerHeight: number
  originalStartUtc: string
  originalEndUtc: string
  originalDate: string // optional convenience for day grid
}

export interface CalendarDayProps {
  day: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: Occurrence[]
  onEventClick?: (event: Occurrence) => void
}

export interface CalendarWeekViewProps {
  currentDate: Date
  events: Occurrence[]
  onEventClick?: (event: Occurrence) => void
}

export interface CalendarMonthViewProps {
  currentDate: Date
  events: Occurrence[]
  onEventClick?: (event: Occurrence) => void
  onDayClick?: (date: Date) => void
}

// Minimal shapes for recurrence children
export interface TaskException { taskId: string; occurrenceStart: string } // UTC
export interface TaskRDate { taskId: string; occurrenceStart: string; occurrenceEnd?: string } // UTC
export interface TaskOverride {
  taskId: string; occurrenceStart: string; // targets original instance
  newStart?: string; newEnd?: string;      // UTC (moved) 
  title?: string; color?: string; status?: Task["status"]; // optional patches
}

export interface CalendarWindow { startUtc: string; endUtc: string; timezone: string }

// Pseudocode: expand RRULE in `timezone`, apply exceptions/rdates/overrides.
export function buildOccurrences(
  tasks: Task[],
  exceptions: TaskException[],
  rdates: TaskRDate[],
  overrides: TaskOverride[],
  win: CalendarWindow
): Occurrence[] {
  // 1) Start with single (non-recurring) tasks -> ONE occurrence each if within window.
  // 2) Expand recurring tasks via rrule (lib) in `timezone` -> base instances.
  // 3) Remove instances listed in exceptions.
  // 4) Add all RDATE rows as occurrences (use occurrenceEnd if provided, else derive).
  // 5) Apply overrides: if newStart/newEnd present -> treat as moved (OVERRIDE_MOVED).
  // 6) Map to Occurrence shape and sort by startUtc.
  return [];
}