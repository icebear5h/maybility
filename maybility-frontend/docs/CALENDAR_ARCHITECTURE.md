# Calendar Architecture - Complete Guide

## Table of Contents
1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Architecture Diagram](#architecture-diagram)
4. [Data Flow](#data-flow)
5. [Schema](#schema)
6. [Types](#types)
7. [Key Functions](#key-functions)
8. [API Routes](#api-routes)
9. [Frontend Integration](#frontend-integration)
10. [Testing](#testing)
11. [Migration Status](#migration-status)

---

## Overview

The calendar uses a **series-based architecture** where each Task represents a series definition (even single events are series with one occurrence). Events are expanded client-side for the visible window, with proper timezone handling using Luxon.

### Key Technologies
- **Luxon** - Timezone-aware date/time handling
- **RRule** - Recurring event expansion
- **Prisma** - Database ORM
- **Next.js** - API routes and frontend

---

## Core Principles

### 1. Treat Each Task as a Series Definition
Even single events are stored as series with one occurrence. This provides a unified model for all events.

### 2. Store Everything in UTC
Database stores absolute UTC timestamps. This is the source of truth.

### 3. Convert at Edges Only
Timezone conversion happens only when:
- **Entering system**: User input → UTC (API layer)
- **Leaving system**: UTC → User's timezone (Display layer)

### 4. Client-Side Expansion
Recurring events are expanded in the browser for the visible window. This keeps the server lightweight and allows for flexible rendering.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│  (Event Modal, Calendar Grid, Drag & Drop)                      │
│  Works with: EventFormData, Occurrence                          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ date, startTime, endTime, timezone
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│  POST /api/tasks - Create series                                │
│  PATCH /api/tasks/[id] - Update series                          │
│  GET /api/tasks - Fetch series definitions                      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Luxon: localTime → UTC
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE                                 │
│  Task (series definition):                                       │
│    - startDate: DateTime (UTC seed)                             │
│    - endDate: DateTime (UTC)                                    │
│    - timezone: String (IANA)                                    │
│    - rrule: String (RRuleSet)                                   │
│    - occurrenceType: SINGLE | RRULE                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Fetch series + exceptions + overrides
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT-SIDE EXPANSION                         │
│  expandToOccurrences(tasks, windowStart, windowEnd)            │
│    - For SINGLE: Pass through one occurrence                    │
│    - For RRULE: Use RRuleSet.between() in event timezone       │
│    - Apply exceptions (skip occurrences)                        │
│    - Apply overrides (modify occurrences)                       │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ ExpandedOccurrence[] (UTC)
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                         RENDERING                                │
│  occurrenceToDisplay(occurrence, viewerTZ)                      │
│    - Convert UTC → viewer's timezone                            │
│    - Extract date, startTime, endTime for display              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### A. Create Event (UI → DB)

**1. User Input (Event Modal)**
```typescript
{
  date: "2024-10-10",           // YYYY-MM-DD
  startTime: "09:00",           // HH:MM
  endTime: "10:00",             // HH:MM
  timezone: "America/New_York", // IANA timezone
  title: "Team Meeting",
  isRecurring: false
}
```

**2. API Processing (Luxon)**
```typescript
// Compose local datetime in event timezone
const startLocal = DateTime.fromISO("2024-10-10T09:00:00", { 
  zone: "America/New_York" 
})
const endLocal = DateTime.fromISO("2024-10-10T10:00:00", { 
  zone: "America/New_York" 
})

// Handle cross-midnight events
if (endLocal <= startLocal) {
  endLocal = endLocal.plus({ days: 1 })
}

// Convert to UTC for storage
const startUtc = startLocal.toUTC()  // "2024-10-10T13:00:00.000Z"
const endUtc = endLocal.toUTC()      // "2024-10-10T14:00:00.000Z"
```

**3. Database Storage**
```typescript
{
  startDate: Date("2024-10-10T13:00:00.000Z"),  // UTC instant
  endDate: Date("2024-10-10T14:00:00.000Z"),    // UTC instant
  timezone: "America/New_York",                  // Event timezone
  occurrenceType: "SINGLE"
}
```

### B. Expand for Display (DB → UI)

**1. Fetch from Database**
```typescript
const tasks = await prisma.task.findMany({
  where: { userId },
  include: {
    exceptions: true,
    overrides: true
  }
})
```

**2. Client-Side Expansion**
```typescript
// Define visible window (UTC)
const windowStart = "2024-10-01T00:00:00.000Z"
const windowEnd = "2024-10-31T23:59:59.999Z"

// Build exception/override maps
const exceptionsMap = new Map(tasks.map(t => [t.id, t.exceptions]))
const overridesMap = new Map(tasks.map(t => [t.id, t.overrides]))

// Expand all tasks
const occurrences = expandToOccurrences(
  tasks,
  windowStart,
  windowEnd,
  exceptionsMap,
  overridesMap
)
```

**3. Convert to Display Format**
```typescript
const viewerTz = "America/Los_Angeles"  // User's current timezone

const displayOccurrence = occurrenceToDisplay(occurrence, viewerTz)
// {
//   date: Date("2024-10-10"),      // Local date object
//   startTime: "06:00",             // 9 AM EST = 6 AM PST
//   endTime: "07:00",
//   displayStart: "2024-10-10T06:00:00-07:00"
// }
```

### C. Edit Event (UI)

**1. Convert to Edit Format**
```typescript
const editData = occurrenceToEdit(occurrence)
// {
//   editDate: "2024-10-10",        // In event's timezone
//   editStartTime: "09:00",         // In event's timezone
//   editEndTime: "10:00",
//   editTimezone: "America/New_York"
// }
```

**2. Submit Update**
```typescript
const formData = occurrenceToFormData(occurrence)
const apiData = formDataToTaskUpdate(formData)

await fetch(`/api/tasks/${seriesId}`, {
  method: 'PATCH',
  body: JSON.stringify(apiData)
})
```

---

## Schema

### Task (Series Definition)

```prisma
model Task {
  id              String         @id @default(cuid())
  title           String
  description     String?
  status          TaskStatus     @default(TODO)
  priority        Priority       @default(MEDIUM)
  color           String         @default("#3b82f6")
  userId          String
  goalId          String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  
  // Series definition (source of truth)
  startDate       DateTime      // UTC instant (seed for recurring)
  endDate         DateTime?     // UTC instant
  timezone        String?       // IANA timezone (required for RRULE)
  
  // Discriminator
  occurrenceType  OccurrenceType @default(SINGLE)
  
  // Recurring event fields
  rrule           String?       // RRuleSet string
  
  // Relations
  user            User           @relation(...)
  goal            Goal?          @relation(...)
  exceptions      RecurringException[]
  overrides       RecurringOverride[]
}
```

### RecurringException

```prisma
model RecurringException {
  id              String   @id @default(cuid())
  eventId         String
  originalStart   DateTime // UTC timestamp of occurrence to skip
  isCancelled     Boolean  @default(true)
  
  event           Task     @relation(...)
  
  @@unique([eventId, originalStart])
}
```

### RecurringOverride

```prisma
model RecurringOverride {
  id              String   @id @default(cuid())
  eventId         String
  originalStart   DateTime // UTC timestamp of occurrence to modify
  newStart        DateTime? // New UTC start (if time changed)
  newEnd          DateTime? // New UTC end
  title           String?
  description     String?
  status          TaskStatus?
  
  event           Task     @relation(...)
  
  @@unique([eventId, originalStart])
}
```

---

## Types

### Frontend Types

```typescript
// Display format (what UI components use)
interface Occurrence {
  id: string                    // Unique ID for this occurrence
  seriesId: string              // Task ID (series definition)
  occurrenceKey: string         // Unique key for this occurrence
  
  // Display data (in viewer's timezone)
  date: Date
  startTime: string             // HH:MM
  endTime: string               // HH:MM
  
  // Event data
  title: string
  description: string
  color: string
  status: "TODO" | "IN_PROGRESS" | "DONE"
  priority: string
  
  // Metadata
  source: 'SINGLE' | 'RRULE' | 'OVERRIDE'
  timezone: string
  hasOverride: boolean
  isException: boolean
  
  goalId?: string
  taskId?: string  // Deprecated, use seriesId
}

// Form data (what event modal uses)
interface EventFormData {
  title: string
  description: string
  date: string                  // YYYY-MM-DD
  startTime: string             // HH:MM
  endTime: string               // HH:MM
  timezone: string              // IANA timezone
  color?: string
  status?: "TODO" | "IN_PROGRESS" | "DONE"
  priority?: string
  isRecurring?: boolean
  rruleConfig?: RecurrenceConfig
}
```

### Internal Types

```typescript
// Expanded occurrence (internal format)
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

---

## Key Functions

### Series Expansion (`lib/series-expansion.ts`)

```typescript
/**
 * Expands tasks into occurrences within a time window
 */
function expandToOccurrences(
  tasks: Task[],
  windowStartUtc: string,
  windowEndUtc: string,
  exceptionsMap: Map<string, RecurringException[]>,
  overridesMap: Map<string, RecurringOverride[]>
): ExpandedOccurrence[]

/**
 * Converts expanded occurrence to display format
 */
function occurrenceToDisplay(
  occurrence: ExpandedOccurrence,
  viewerTz: string
): Occurrence & DisplayData

/**
 * Converts occurrence to edit format in event's timezone
 */
function occurrenceToEdit(
  occurrence: ExpandedOccurrence
): EditData
```

### Form Utilities (`lib/occurrence-utils.ts`)

```typescript
/**
 * Converts Occurrence to EventFormData for editing
 */
function occurrenceToFormData(
  occurrence: Occurrence
): EventFormData

/**
 * Converts EventFormData to API request format
 */
function formDataToTaskUpdate(
  formData: EventFormData
): APIRequestData
```

---

## API Routes

### POST `/api/tasks` - Create Event

**Request:**
```json
{
  "title": "Team Meeting",
  "description": "Weekly sync",
  "date": "2024-10-10",
  "startTime": "09:00",
  "endTime": "10:00",
  "timezone": "America/New_York",
  "status": "TODO",
  "priority": "MEDIUM",
  "color": "#3b82f6"
}
```

**Processing:**
1. Validate required fields
2. Convert local date/time to UTC using Luxon
3. Handle cross-midnight events
4. Store in database

**Response:**
```json
{
  "id": "clxxx...",
  "startDate": "2024-10-10T13:00:00.000Z",
  "endDate": "2024-10-10T14:00:00.000Z",
  "timezone": "America/New_York",
  "occurrenceType": "SINGLE",
  ...
}
```

### PATCH `/api/tasks/[id]` - Update Event

**Request:**
```json
{
  "date": "2024-10-11",
  "startTime": "10:00",
  "endTime": "11:00",
  "timezone": "America/New_York"
}
```

**Processing:**
1. Fetch existing task
2. Merge updates
3. Convert to UTC if date/time changed
4. Update database

### GET `/api/tasks` - Fetch Events

**Query Params:**
- `startDate` - Window start (YYYY-MM-DD)
- `endDate` - Window end (YYYY-MM-DD)

**Response:**
```json
[
  {
    "id": "clxxx...",
    "startDate": "2024-10-10T13:00:00.000Z",
    "timezone": "America/New_York",
    "occurrenceType": "SINGLE",
    "exceptions": [],
    "overrides": [],
    ...
  }
]
```

**Note:** Returns Task[] (series definitions), not expanded occurrences. Client handles expansion.

---

## Frontend Integration

### 1. Fetch and Expand

```typescript
// hooks/use-calendar-events.ts

export function useCalendarEvents(viewDate: Date) {
  const [occurrences, setOccurrences] = useState<Occurrence[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function loadEvents() {
      // Calculate window
      const windowStart = DateTime.fromJSDate(viewDate)
        .startOf('month')
        .toUTC()
        .toISO()
      const windowEnd = DateTime.fromJSDate(viewDate)
        .endOf('month')
        .toUTC()
        .toISO()
      
      // Fetch tasks
      const response = await fetch(
        `/api/tasks?startDate=${windowStart}&endDate=${windowEnd}`
      )
      const tasks = await response.json()
      
      // Build maps
      const exceptionsMap = new Map(tasks.map(t => [t.id, t.exceptions || []]))
      const overridesMap = new Map(tasks.map(t => [t.id, t.overrides || []]))
      
      // Expand
      const expanded = expandToOccurrences(
        tasks,
        windowStart,
        windowEnd,
        exceptionsMap,
        overridesMap
      )
      
      // Convert to display format
      const viewerTz = getUserTimezone()
      const display = expanded.map(occ => 
        occurrenceToDisplay(occ, viewerTz)
      )
      
      setOccurrences(display)
      setLoading(false)
    }
    
    loadEvents()
  }, [viewDate])
  
  return { occurrences, loading }
}
```

### 2. Create Event

```typescript
// Event modal submit handler

async function handleSubmit(formData: EventFormData) {
  const apiData = formDataToTaskUpdate(formData)
  
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apiData)
  })
  
  if (response.ok) {
    // Refresh calendar
    refetch()
  }
}
```

### 3. Edit Event

```typescript
// When opening edit modal

const formData = occurrenceToFormData(selectedOccurrence)
setEditFormData(formData)

// When submitting

const apiData = formDataToTaskUpdate(formData)

await fetch(`/api/tasks/${selectedOccurrence.seriesId}`, {
  method: 'PATCH',
  body: JSON.stringify(apiData)
})
```

---

## Testing

### Unit Tests

```typescript
// lib/series-expansion.test.ts

describe('expandToOccurrences', () => {
  it('expands single event', () => {
    const tasks = [singleTask]
    const occurrences = expandToOccurrences(tasks, windowStart, windowEnd)
    expect(occurrences).toHaveLength(1)
  })
  
  it('expands weekly recurring event', () => {
    const tasks = [weeklyTask]
    const occurrences = expandToOccurrences(tasks, windowStart, windowEnd)
    expect(occurrences.length).toBeGreaterThan(1)
  })
  
  it('applies exceptions', () => {
    const exceptions = [{ originalStart: '2024-10-10T13:00:00.000Z' }]
    const occurrences = expandToOccurrences(tasks, windowStart, windowEnd, exceptionsMap)
    // Should skip the exception date
  })
})
```

### Integration Tests

```typescript
// API route tests

describe('POST /api/tasks', () => {
  it('creates single event with timezone conversion', async () => {
    const response = await POST({
      date: '2024-10-10',
      startTime: '09:00',
      endTime: '10:00',
      timezone: 'America/New_York'
    })
    
    const task = await response.json()
    expect(task.startDate).toBe('2024-10-10T13:00:00.000Z')
  })
})
```

---

## Migration Status

### ✅ Completed

- [x] Schema updated (removed startTime/endTime)
- [x] Luxon installed
- [x] Series expansion utilities created
- [x] API routes updated (POST, PATCH, GET)
- [x] Form utilities created
- [x] Documentation consolidated

### ⏳ In Progress

- [ ] Update hooks to use expansion
- [ ] Update event modal
- [ ] Update calendar components
- [ ] Rewrite tests

### 📋 TODO

- [ ] Add windowed data fetching
- [ ] Add timezone context
- [ ] Add RRule builder UI
- [ ] Add exception/override UI
- [ ] Performance optimization

---

## Troubleshooting

### Issue: Dates shifting by one day

**Cause:** Not using timezone-aware conversion

**Solution:** Always use Luxon for date/time operations:
```typescript
// ❌ Wrong
new Date('2024-10-10')

// ✅ Right
DateTime.fromISO('2024-10-10', { zone: timezone })
```

### Issue: Times wrong after DST change

**Cause:** Storing fixed offset instead of timezone

**Solution:** Store IANA timezone, not offset:
```typescript
// ❌ Wrong
timezone: 'UTC-5'

// ✅ Right
timezone: 'America/New_York'
```

### Issue: Recurring events not showing

**Cause:** Not expanding on client side

**Solution:** Use `expandToOccurrences()` after fetching tasks

---

## Performance Considerations

### Windowed Fetching

Only fetch and expand events for the visible window:
- Month view: Current month ± 1 week
- Week view: Current week ± 3 days
- Day view: Current day ± 1 day

### Memoization

Cache expanded occurrences:
```typescript
const cacheKey = `${windowStart}-${windowEnd}-${tasksHash}`
if (cache.has(cacheKey)) {
  return cache.get(cacheKey)
}
```

### Lazy Loading

Load recurring events on demand:
- Initial load: Single events only
- On scroll/navigation: Expand recurring events

---

## Future Enhancements

1. **Server-side materialization** - Pre-compute next N weeks
2. **Multi-timezone view** - Show events in multiple timezones
3. **Smart timezone detection** - Detect when user travels
4. **Conflict detection** - Warn about overlapping events
5. **Timezone suggestions** - Suggest timezone based on event title

---

## References

- [Luxon Documentation](https://moment.github.io/luxon/)
- [RRule Documentation](https://github.com/jakubroztocil/rrule)
- [IANA Timezone Database](https://www.iana.org/time-zones)
- [RFC 5545 (iCalendar)](https://tools.ietf.org/html/rfc5545)
