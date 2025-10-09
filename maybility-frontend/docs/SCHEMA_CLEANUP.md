# Task Schema Cleanup Plan

## Current Issues

The `Task` model has some redundant/confusing fields that make it unclear how single vs recurring events work:

```prisma
model Task {
  // ... other fields ...
  
  dtstart         DateTime?      // Used for BOTH single events AND recurring series start
  dtend           DateTime?      // ❌ NOT USED - we use startTime/endTime instead
  startTime       String?        // "HH:MM" - used for all events
  endTime         String?        // "HH:MM" - used for all events
  
  // Recurring fields
  rrule           String?        
  startDate       DateTime?      // ❌ REDUNDANT - same as dtstart
  endDate         DateTime?      // Series end date (optional)
}
```

## Two Usage Patterns

### 1. Single Events (occurrenceType = SINGLE)
- `dtstart` = The specific date of the event
- `startTime` = Time like "09:00"
- `endTime` = Time like "10:00"
- `rrule` = null
- `endDate` = null

### 2. Recurring Events (occurrenceType = RRULE)
- `dtstart` = The **first occurrence** date (series start)
- `startTime` = Time for **all occurrences**
- `endTime` = Time for **all occurrences**
- `rrule` = Recurrence rule (e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR")
- `endDate` = When the series ends (optional)

## Proposed Cleanup

### Remove Unused Fields
```prisma
model Task {
  // ... other fields ...
  
  // Date and time fields
  dtstart         DateTime?      // Event date (single) OR series start (recurring)
  // ❌ REMOVE: dtend           DateTime?
  startTime       String?        // "HH:MM" in UTC
  endTime         String?        // "HH:MM" in UTC
  
  // Recurring event fields (only used when occurrenceType = RRULE)
  rrule           String?        // e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  // ❌ REMOVE: startDate       DateTime?
  endDate         DateTime?      // Optional end date for the series
}
```

### Add Better Documentation
```prisma
model Task {
  // ... other fields ...
  
  // Discriminator field - determines which type of event this is
  occurrenceType       OccurrenceType      @default(SINGLE)
  
  // === SINGLE EVENT FIELDS (occurrenceType = SINGLE) ===
  // For single events, dtstart is the specific date of the event
  
  // === RECURRING EVENT FIELDS (occurrenceType = RRULE) ===
  // For recurring events, dtstart is the first occurrence date
  // The rrule defines the pattern, and endDate defines when the series ends
  
  dtstart         DateTime?      // Event date (single) OR first occurrence (recurring)
  startTime       String?        // "HH:MM" in UTC - applies to all occurrences
  endTime         String?        // "HH:MM" in UTC - applies to all occurrences
  
  // Recurring event fields (only used when occurrenceType = RRULE)
  rrule           String?        // e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  endDate         DateTime?      // Optional end date for the recurring series
}
```

## Migration Steps

1. **Create migration to remove unused fields:**
   ```bash
   npx prisma migrate dev --name remove_unused_task_fields
   ```

2. **Update TypeScript types** in `types/task-types.ts`

3. **Update API routes** - Remove any references to `dtend` and `startDate`

4. **Run tests** to ensure everything still works

## Benefits

- ✅ Clearer distinction between single and recurring events
- ✅ Less confusion about which fields to use
- ✅ Smaller database footprint
- ✅ Better documentation in schema
- ✅ Easier for new developers to understand

## Testing Strategy

We have comprehensive unit tests for the conversion utilities:
- `lib/occurrence-utils.test.ts` - 16 tests covering all conversion scenarios
- Run with: `npm run test`
- All tests currently passing ✅
