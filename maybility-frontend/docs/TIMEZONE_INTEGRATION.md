# Timezone Integration Summary

## Overview

All date/time conversions between frontend and backend now use the centralized timezone utility functions.

## Data Flow

```
Frontend (User's Timezone)
    ↓
    combineDateTimeToUtc()
    ↓
Backend API (UTC)
    ↓
Database (UTC timestamps)
    ↓
Backend API (UTC)
    ↓
Series Expansion (UTC → Display)
    ↓
    utcToTimezone() / extractDateTimeFromUtc()
    ↓
Frontend (User's Timezone)
```

## Backend Changes

### 1. POST /api/tasks (Create Event)

**Before:**
```typescript
const startLocal = DateTime.fromISO(`${data.date}T${data.startTime}:00`, { zone: data.timezone })
const startUtc = startLocal.toUTC().toJSDate()
```

**After:**
```typescript
const startUtc = combineDateTimeToUtc(data.date, data.startTime, data.timezone)
if (!startUtc) {
  return NextResponse.json({ error: 'Invalid date/time conversion' }, { status: 400 })
}
taskData.startTime = startUtc.toJSDate()
```

**Benefits:**
- ✅ Centralized conversion logic
- ✅ Automatic error handling
- ✅ Consistent null checks
- ✅ Better logging

---

### 2. PATCH /api/tasks/[id] (Update Event)

**Before:**
```typescript
const startLocal = DateTime.fromISO(`${data.date}T${data.startTime}:00`, { zone: timezone })
updateData.startTime = startLocal.toUTC().toJSDate()
```

**After:**
```typescript
const startUtc = combineDateTimeToUtc(data.date, data.startTime, timezone)
if (!startUtc) {
  return NextResponse.json({ error: 'Invalid date/time conversion' }, { status: 400 })
}
updateData.startTime = startUtc.toJSDate()
```

**Special Case - Date-Only Updates:**
```typescript
// Extract existing times from UTC
const existingStart = extractDateTimeFromUtc(task.startTime, task.timezone)
const existingEnd = extractDateTimeFromUtc(task.endTime, task.timezone)

// Combine with new date
const newStartUtc = combineDateTimeToUtc(data.date, existingStart.time, task.timezone)
const newEndUtc = combineDateTimeToUtc(data.date, existingEnd.time, task.timezone)
```

---

### 3. GET /api/tasks (Fetch Events)

**Current:** Returns raw UTC timestamps from database

**Frontend Handles:** Series expansion converts UTC → Display timezone

```typescript
// In series-expansion.ts
const displayOccurrences = expandedOccurrences.map(occ => 
  occurrenceToDisplay(occ, viewerTz)
)

// occurrenceToDisplay uses utcToTimezone internally
const startUtc = DateTime.fromISO(occurrence.startUtc, { zone: 'utc' })
const displayStart = startUtc.setZone(viewerTz)
```

---

## Frontend Integration

### Current State

The frontend already uses the series expansion system which internally handles timezone conversions:

**1. Fetching Events:**
```typescript
// hooks/use-calendar-state.ts
const tasks = await res.json()

// Expand to occurrences (handles UTC → Display)
const expandedOccurrences = expandToOccurrences(tasks, windowStartUtc, windowEndUtc, ...)
const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone
const displayOccurrences = expandedOccurrences.map(occ => 
  occurrenceToDisplay(occ, viewerTz)
)
```

**2. Creating Events:**
```typescript
// hooks/use-calendar-state.ts
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

const requestBody = {
  date: eventData.date,
  startTime: eventData.startTime,
  endTime: eventData.endTime,
  timezone: timezone,  // User's timezone
}

// Backend converts to UTC using combineDateTimeToUtc()
await fetch('/api/tasks', {
  method: 'POST',
  body: JSON.stringify(requestBody)
})
```

---

## Error Handling

All timezone conversions now include proper error handling:

### Backend
```typescript
const startUtc = combineDateTimeToUtc(data.date, data.startTime, data.timezone)

if (!startUtc) {
  console.error('[POST /api/tasks] Failed to convert times to UTC')
  return NextResponse.json(
    { error: 'Invalid date/time conversion' },
    { status: 400 }
  )
}
```

### Frontend
```typescript
// Series expansion handles invalid dates gracefully
if (!occurrence.startUtc || !occurrence.endUtc) {
  console.error('[occurrenceToDisplay] Missing UTC times:', occurrence)
  throw new Error(`Invalid occurrence: missing startUtc or endUtc`)
}
```

---

## Cross-Midnight Events

Both backend endpoints handle events that span midnight:

```typescript
// If end time is before start time, assume next day
if (endUtc <= startUtc) {
  const nextDay = new Date(data.date)
  nextDay.setDate(nextDay.getDate() + 1)
  const nextDayStr = nextDay.toISOString().split('T')[0]
  endUtc = combineDateTimeToUtc(nextDayStr, data.endTime, timezone)
}
```

**Example:**
```
User Input: Oct 15, 2024, 11:00 PM - 1:00 AM (America/New_York)
Stored As:  
  - startTime: 2024-10-16T03:00:00.000Z
  - endTime:   2024-10-16T05:00:00.000Z
```

---

## Testing

### Backend Tests
Run API endpoint tests:
```bash
# Test event creation with different timezones
curl -X POST /api/tasks \
  -d '{"date":"2024-10-15","startTime":"09:00","endTime":"10:00","timezone":"America/New_York"}'

# Verify UTC conversion
# Expected: startTime = 2024-10-15T13:00:00.000Z (9 AM EDT = 1 PM UTC)
```

### Frontend Tests
```bash
npm test lib/series-expansion.test.ts
npm test lib/timezone-utils.test.ts
```

---

## Migration Checklist

- [x] Update POST /api/tasks to use `combineDateTimeToUtc()`
- [x] Update PATCH /api/tasks/[id] to use timezone utils
- [x] Add error handling for invalid conversions
- [x] Handle cross-midnight events
- [x] Frontend already uses series expansion (no changes needed)
- [ ] Run Prisma generate to update types
- [ ] Test event creation in different timezones
- [ ] Test event updates
- [ ] Test cross-midnight events
- [ ] Test DST transitions

---

## Benefits

### 1. Consistency
- All conversions use the same utility functions
- No duplicate conversion logic
- Easier to maintain

### 2. Error Handling
- Centralized null checks
- Detailed error logging
- Graceful failures

### 3. Type Safety
- Luxon DateTime types
- Null returns on error
- TypeScript validation

### 4. Testability
- Comprehensive test suite
- Edge case coverage
- Easy to add new tests

### 5. Debugging
- Consistent log format
- Clear error messages
- Traceable conversions

---

## Common Issues & Solutions

### Issue: "Invalid date/time conversion"
**Cause:** Invalid date format or timezone
**Solution:** Validate input before sending to API
```typescript
if (!isValidTimezone(timezone)) {
  throw new Error('Invalid timezone')
}
```

### Issue: Times off by one hour
**Cause:** DST transition
**Solution:** Always store event's original timezone
```typescript
{
  startTime: DateTime (UTC),
  timezone: String (IANA)  // Original timezone
}
```

### Issue: Cross-midnight events not working
**Cause:** End time before start time not detected
**Solution:** Backend automatically handles this
```typescript
if (endUtc <= startUtc) {
  // Automatically moves to next day
}
```

---

## Future Enhancements

### 1. Recurring Events Across DST
Handle recurring events that span DST transitions:
```typescript
// Event: "Every day at 9 AM EST"
// During DST: 9 AM EDT (UTC-4)
// After DST:  9 AM EST (UTC-5)
```

### 2. Timezone Change Detection
Detect when user changes timezone and update display:
```typescript
useEffect(() => {
  const newTz = getUserTimezone()
  if (newTz !== currentTz) {
    refetchEvents() // Re-expand with new timezone
  }
}, [])
```

### 3. Bulk Operations
Optimize bulk event creation/updates:
```typescript
const utcTimes = events.map(e => 
  combineDateTimeToUtc(e.date, e.time, e.timezone)
)
```

---

## References

- [Timezone Utils Documentation](./TIMEZONE_UTILS.md)
- [Data Flow Documentation](./DATA_FLOW.md)
- [Series Expansion](../lib/series-expansion.ts)
- [Luxon Documentation](https://moment.github.io/luxon/)
