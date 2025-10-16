# Calendar Data Flow - Complete Guide

## Overview

This document describes the complete data flow from API to UI components, showing how raw Task data is transformed into displayable Occurrence objects.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                         COMPONENTS                               │
│  (EventModal, CalendarGrid, etc.)                               │
│  Works with: Occurrence interface                               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Occurrence[] (display format)
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT-SIDE EXPANSION                         │
│  expandToOccurrences() + occurrenceToDisplay()                  │
│  Converts: Task[] → ExpandedOccurrence[] → Occurrence[]         │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Task[] (raw backend data)
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│  GET /api/tasks - Returns Task[] with exceptions/overrides      │
│  POST /api/tasks - Creates Task from form data                  │
│  PATCH /api/tasks/[id] - Updates Task                           │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ UTC timestamps + timezone
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE                                 │
│  Task (series definition with UTC timestamps)                   │
│  RecurringException, RecurringOverride                          │
└─────────────────────────────────────────────────────────────────┘
```

## Data Types

### 1. Task (Backend/Database)

```typescript
interface Task {
  id: string
  title: string
  description: string | null
  status: "TODO" | "IN_PROGRESS" | "DONE"
  priority: "LOW" | "MEDIUM" | "HIGH"
  color: string
  userId: string
  goalId: string | null
  
  // Series definition (source of truth)
  startDate: Date        // UTC instant
  endDate: Date | null   // UTC instant
  timezone: string | null  // IANA timezone
  occurrenceType: "SINGLE" | "RRULE"
  rrule: string | null   // RRuleSet string
  
  createdAt: Date
  updatedAt: Date
}
```

### 2. ExpandedOccurrence (Internal)

```typescript
interface ExpandedOccurrence {
  id: string
  seriesId: string
  occurrenceKey: string
  
  // Times (UTC ISO strings)
  startUtc: string
  endUtc: string
  
  // Event timezone
  timezone: string
  
  // Source
  source: 'SINGLE' | 'RRULE' | 'OVERRIDE'
  
  // Display fields
  title: string
  description: string
  color: string
  status: string
  priority: string
  
  // Metadata
  isException: boolean
  hasOverride: boolean
}
```

### 3. Occurrence (Frontend Display)

```typescript
interface Occurrence {
  id: string                    // Unique ID for this occurrence
  seriesId: string              // Task ID (series definition)
  occurrenceKey: string         // Unique key for this occurrence
  
  // Display data (in viewer's timezone)
  date: Date                    // Display date
  startTime: string             // Display start time (HH:MM)
  endTime: string               // Display end time (HH:MM)
  
  // Event data
  title: string
  description: string
  color: string
  status: "TODO" | "IN_PROGRESS" | "DONE"
  priority: string
  
  // Metadata
  source: 'SINGLE' | 'RRULE' | 'OVERRIDE'
  timezone: string              // Event's timezone
  hasOverride: boolean
  isException: boolean
  
  // Optional
  goalId?: string
  taskId?: string  // Deprecated, use seriesId
}
```

## Complete Data Flow

### A. Fetching and Displaying Events

```typescript
// 1. COMPONENT: Request events for visible window
const windowStart = new Date(2024, 9, 1)  // Oct 1, 2024
const windowEnd = new Date(2024, 9, 31)   // Oct 31, 2024

// 2. HOOK: Fetch from API
const response = await fetch(
  `/api/tasks?startDate=${windowStart.toISOString()}&endDate=${windowEnd.toISOString()}`
)
const tasks: Task[] = await response.json()

// Example Task from API:
{
  id: "task-1",
  title: "Daily Standup",
  startDate: new Date("2024-10-01T13:00:00.000Z"),  // 9 AM EST
  endDate: new Date("2024-10-01T13:30:00.000Z"),    // 9:30 AM EST
  timezone: "America/New_York",
  occurrenceType: "RRULE",
  rrule: "DTSTART:20241001T130000Z\nRRULE:FREQ=DAILY;COUNT=5",
  exceptions: [],
  overrides: []
}

// 3. HOOK: Expand tasks to occurrences
const windowStartUtc = DateTime.fromJSDate(windowStart).toUTC().toISO()
const windowEndUtc = DateTime.fromJSDate(windowEnd).toUTC().toISO()

const exceptionsMap = new Map(tasks.map(t => [t.id, t.exceptions || []]))
const overridesMap = new Map(tasks.map(t => [t.id, t.overrides || []]))

const expandedOccurrences = expandToOccurrences(
  tasks,
  windowStartUtc,
  windowEndUtc,
  exceptionsMap,
  overridesMap
)

// Example ExpandedOccurrence:
{
  id: "task-1-2024-10-01T09:00",
  seriesId: "task-1",
  occurrenceKey: "task-1-2024-10-01T09:00",
  startUtc: "2024-10-01T13:00:00.000Z",
  endUtc: "2024-10-01T13:30:00.000Z",
  timezone: "America/New_York",
  source: "RRULE",
  title: "Daily Standup",
  // ... other fields
}

// 4. HOOK: Convert to display format
const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone  // "America/Los_Angeles"

const displayOccurrences = expandedOccurrences.map(occ => 
  occurrenceToDisplay(occ, viewerTz)
)

// Example Occurrence (display format):
{
  id: "task-1-2024-10-01T09:00",
  seriesId: "task-1",
  occurrenceKey: "task-1-2024-10-01T09:00",
  date: new Date("2024-10-01T06:00:00-07:00"),  // Local date object
  startTime: "06:00",  // 9 AM EST = 6 AM PST
  endTime: "06:30",    // 9:30 AM EST = 6:30 AM PST
  timezone: "America/New_York",
  source: "RRULE",
  title: "Daily Standup",
  // ... other fields
}

// 5. COMPONENT: Render occurrences
{displayOccurrences.map(occurrence => (
  <EventCard key={occurrence.id} occurrence={occurrence} />
))}
```

### B. Creating an Event

```typescript
// 1. COMPONENT: User fills out form
const formData = {
  title: "Team Meeting",
  description: "Weekly sync",
  date: "2024-10-15",
  startTime: "09:00",
  endTime: "10:00",
  timezone: "America/New_York"
}

// 2. HOOK: Send to API
const response = await fetch('/api/tasks', {
  method: 'POST',
  body: JSON.stringify({
    title: formData.title,
    description: formData.description,
    date: formData.date,
    startTime: formData.startTime,
    endTime: formData.endTime,
    timezone: formData.timezone,
    status: 'TODO',
    priority: 'MEDIUM',
    color: '#3b82f6',
  })
})

// 3. API: Convert to UTC using Luxon
const startLocal = DateTime.fromISO(
  `${data.date}T${data.startTime}:00`, 
  { zone: data.timezone }
)
const startUtc = startLocal.toUTC()  // "2024-10-15T13:00:00.000Z"

// 4. API: Store in database
await prisma.task.create({
  data: {
    title: data.title,
    startDate: startUtc.toJSDate(),
    endDate: endUtc.toJSDate(),
    timezone: data.timezone,
    occurrenceType: 'SINGLE',
    // ... other fields
  }
})

// 5. HOOK: Refresh calendar
refetchEvents()  // Re-fetches, expands, and displays
```

### C. Editing an Event

```typescript
// 1. COMPONENT: User clicks event
const selectedOccurrence: Occurrence = {
  id: "task-1-2024-10-15T09:00",
  seriesId: "task-1",
  date: new Date("2024-10-15T06:00:00-07:00"),
  startTime: "06:00",  // Displayed in PST
  endTime: "07:00",
  timezone: "America/New_York",  // Event's timezone
  // ... other fields
}

// 2. COMPONENT: Convert to edit format (in event's timezone)
const editData = occurrenceToEdit(expandedOccurrence)
// {
//   editDate: "2024-10-15",
//   editStartTime: "09:00",  // Back to EST
//   editEndTime: "10:00",
//   editTimezone: "America/New_York"
// }

// 3. COMPONENT: User edits and saves
const updates = {
  title: "Updated Meeting",
  date: "2024-10-15",
  startTime: "10:00",  // Changed to 10 AM EST
  endTime: "11:00",
  timezone: "America/New_York"
}

// 4. HOOK: Send to API
await fetch(`/api/tasks/${selectedOccurrence.seriesId}`, {
  method: 'PATCH',
  body: JSON.stringify(updates)
})

// 5. API: Convert and update
const startLocal = DateTime.fromISO(
  `${data.date}T${data.startTime}:00`,
  { zone: data.timezone }
)
await prisma.task.update({
  where: { id: taskId },
  data: {
    startDate: startLocal.toUTC().toJSDate(),
    // ... other fields
  }
})

// 6. HOOK: Refresh calendar
refetchEvents()
```

## Key Functions

### expandToOccurrences()

**Location:** `lib/series-expansion.ts`

**Purpose:** Expands Task[] into ExpandedOccurrence[] for a time window

```typescript
function expandToOccurrences(
  tasks: Task[],
  windowStartUtc: string,
  windowEndUtc: string,
  exceptionsMap: Map<string, RecurringException[]>,
  overridesMap: Map<string, RecurringOverride[]>
): ExpandedOccurrence[]
```

**Process:**
1. For each task, check if SINGLE or RRULE
2. For SINGLE: Return one occurrence if within window
3. For RRULE: Use RRuleSet.between() to generate occurrences
4. Apply exceptions (skip occurrences)
5. Apply overrides (modify occurrences)
6. Return array of ExpandedOccurrence

### occurrenceToDisplay()

**Location:** `lib/series-expansion.ts`

**Purpose:** Converts ExpandedOccurrence to Occurrence (display format)

```typescript
function occurrenceToDisplay(
  occurrence: ExpandedOccurrence,
  viewerTz: string
): Occurrence
```

**Process:**
1. Parse UTC timestamps
2. Convert to viewer's timezone
3. Extract date, startTime, endTime
4. Return Occurrence object

### occurrenceToTaskUpdate()

**Location:** `lib/occurrence-utils.ts`

**Purpose:** Converts Occurrence updates to API request format

```typescript
function occurrenceToTaskUpdate(
  occurrence: Partial<Occurrence>
): any
```

**Process:**
1. Map Occurrence fields to API fields
2. Convert Date to YYYY-MM-DD string
3. Include timezone, startTime, endTime
4. Return API request object

## Component Integration

### use-calendar-state.ts

```typescript
const handleGetEvents = async (windowStart: Date, windowEnd: Date) => {
  // 1. Fetch tasks from API
  const tasks = await fetch(`/api/tasks?...`).then(r => r.json())
  
  // 2. Expand to occurrences
  const expandedOccurrences = expandToOccurrences(tasks, ...)
  
  // 3. Convert to display format
  const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const displayOccurrences = expandedOccurrences.map(occ => 
    occurrenceToDisplay(occ, viewerTz)
  )
  
  // 4. Set state
  setEvents(displayOccurrences)
}
```

### EventModal

```typescript
// When editing
const handleSave = () => {
  const occurrenceUpdates: Partial<Occurrence> = {
    title: newTitle,
    date: new Date(selectedDate),
    startTime: newStartTime,
    endTime: newEndTime,
    // ... other fields
  }
  
  // Convert to API format
  const taskUpdates = occurrenceToTaskUpdate(occurrenceUpdates)
  
  // Send to API
  onUpdate(event.seriesId, taskUpdates)
}
```

## Summary

**Data Flow Direction:**
```
Database (UTC) 
  → API (Task[]) 
  → Expansion (ExpandedOccurrence[]) 
  → Display (Occurrence[]) 
  → Components
```

**Key Points:**
1. **Database stores UTC** - Source of truth
2. **API returns Task[]** - Raw backend data
3. **Client expands** - Generates occurrences for visible window
4. **Components use Occurrence** - Display format in viewer's timezone
5. **Timezone conversion** - Only at edges (API and display)

**Benefits:**
- Clean separation of concerns
- Timezone handling is explicit
- Components work with simple display objects
- Backend handles complex series logic
- Client-side expansion is flexible and fast
