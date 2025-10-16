# Timezone Utilities Documentation

A comprehensive library for timezone conversions using Luxon.

## Installation

The utilities are already available in `lib/timezone-utils.ts`.

```typescript
import {
  utcToTimezone,
  timezoneToUtc,
  convertTimezone,
  combineDateTimeToUtc,
  extractDateTimeFromUtc,
  getUserTimezone,
  isValidTimezone,
  formatInTimezone,
  getTimezoneOffset,
  utcDateToTimezoneDate,
  isDaylightSavingTime,
} from '@/lib/timezone-utils'
```

## Core Functions

### `utcToTimezone(utcTime, timezone)`

Converts a UTC time to a specific timezone.

**Parameters:**
- `utcTime`: UTC time as ISO string or Date object
- `timezone`: Target IANA timezone (e.g., 'America/New_York')

**Returns:** Luxon DateTime in target timezone, or null if invalid

**Example:**
```typescript
const utc = '2024-10-15T13:00:00.000Z'
const est = utcToTimezone(utc, 'America/New_York')
// est.hour = 9 (9 AM EDT)
```

---

### `timezoneToUtc(localTime, timezone)`

Converts a local time in a specific timezone to UTC.

**Parameters:**
- `localTime`: Local time as ISO string or Date object
- `timezone`: Source IANA timezone

**Returns:** Luxon DateTime in UTC, or null if invalid

**Example:**
```typescript
const local = '2024-10-15T09:00:00'
const utc = timezoneToUtc(local, 'America/New_York')
// utc.hour = 13 (1 PM UTC)
```

---

### `convertTimezone(time, fromTimezone, toTimezone)`

Converts time from one timezone to another.

**Parameters:**
- `time`: Time as ISO string or Date object
- `fromTimezone`: Source IANA timezone
- `toTimezone`: Target IANA timezone

**Returns:** Luxon DateTime in target timezone, or null if invalid

**Example:**
```typescript
const time = '2024-10-15T09:00:00'
const pst = convertTimezone(time, 'America/New_York', 'America/Los_Angeles')
// pst.hour = 6 (6 AM PDT)
```

---

### `combineDateTimeToUtc(date, time, timezone)`

Combines a date and time string in a specific timezone and converts to UTC.

**Parameters:**
- `date`: Date string (YYYY-MM-DD)
- `time`: Time string (HH:MM or HH:MM:SS)
- `timezone`: IANA timezone

**Returns:** Luxon DateTime in UTC, or null if invalid

**Example:**
```typescript
const utc = combineDateTimeToUtc('2024-10-15', '09:00', 'America/New_York')
// utc = '2024-10-15T13:00:00.000Z'
```

**Use Case:** Creating events from user input
```typescript
// User enters: Oct 15, 2024 at 9:00 AM in New York
const eventData = {
  date: '2024-10-15',
  startTime: '09:00',
  timezone: 'America/New_York'
}

const startUtc = combineDateTimeToUtc(
  eventData.date,
  eventData.startTime,
  eventData.timezone
)

// Store startUtc in database
await prisma.task.create({
  data: {
    startTime: startUtc.toJSDate(),
    timezone: eventData.timezone
  }
})
```

---

### `extractDateTimeFromUtc(utcTime, timezone)`

Extracts date and time components from a UTC DateTime in a specific timezone.

**Parameters:**
- `utcTime`: UTC time as ISO string or Date object
- `timezone`: Target IANA timezone

**Returns:** Object with `{ date: string, time: string }`, or null if invalid

**Example:**
```typescript
const result = extractDateTimeFromUtc('2024-10-15T13:00:00.000Z', 'America/New_York')
// result = { date: '2024-10-15', time: '09:00' }
```

**Use Case:** Displaying events to users
```typescript
// Database has UTC time
const task = await prisma.task.findUnique({ where: { id } })

// Convert to user's timezone for display
const userTz = getUserTimezone()
const { date, time } = extractDateTimeFromUtc(task.startTime, userTz)

console.log(`Event on ${date} at ${time}`)
// "Event on 2024-10-15 at 09:00"
```

---

## Utility Functions

### `getUserTimezone()`

Gets the current user's timezone.

**Returns:** IANA timezone string (e.g., 'America/New_York')

**Example:**
```typescript
const userTz = getUserTimezone()
// 'America/New_York' (based on user's system)
```

---

### `isValidTimezone(timezone)`

Checks if a timezone string is valid.

**Parameters:**
- `timezone`: IANA timezone string to validate

**Returns:** true if valid, false otherwise

**Example:**
```typescript
isValidTimezone('America/New_York') // true
isValidTimezone('Invalid/Zone') // false
isValidTimezone('EST') // false (abbreviations not valid)
```

---

### `formatInTimezone(time, timezone, format?)`

Formats a DateTime in a specific timezone.

**Parameters:**
- `time`: Time as ISO string or Date object
- `timezone`: IANA timezone
- `format`: Luxon format string (default: 'yyyy-MM-dd HH:mm')

**Returns:** Formatted string, or null if invalid

**Example:**
```typescript
const formatted = formatInTimezone(
  '2024-10-15T13:00:00.000Z',
  'America/New_York',
  'MMM dd, yyyy h:mm a'
)
// 'Oct 15, 2024 9:00 AM'
```

**Common Formats:**
- `'yyyy-MM-dd HH:mm'` → '2024-10-15 09:00'
- `'MMM dd, yyyy'` → 'Oct 15, 2024'
- `'h:mm a'` → '9:00 AM'
- `'EEEE, MMMM dd'` → 'Tuesday, October 15'

---

### `getTimezoneOffset(time, timezone)`

Gets the timezone offset in minutes for a specific timezone at a given time.

**Parameters:**
- `time`: Time as ISO string or Date object
- `timezone`: IANA timezone

**Returns:** Offset in minutes from UTC, or null if invalid

**Example:**
```typescript
getTimezoneOffset('2024-10-15T12:00:00', 'America/New_York')
// -240 (EDT is UTC-4, so -4 * 60 = -240 minutes)

getTimezoneOffset('2024-01-15T12:00:00', 'America/New_York')
// -300 (EST is UTC-5, so -5 * 60 = -300 minutes)
```

---

### `utcDateToTimezoneDate(utcDate, timezone)`

Converts a UTC Date object to a Date object in a specific timezone.

**Parameters:**
- `utcDate`: UTC Date object
- `timezone`: Target IANA timezone

**Returns:** Date object representing the local time, or null if invalid

**Example:**
```typescript
const utc = new Date('2024-10-15T13:00:00.000Z')
const local = utcDateToTimezoneDate(utc, 'America/New_York')
// Date representing 9:00 AM
```

---

### `isDaylightSavingTime(time, timezone)`

Checks if a time is in daylight saving time for a given timezone.

**Parameters:**
- `time`: Time as ISO string or Date object
- `timezone`: IANA timezone

**Returns:** true if DST is active, false otherwise, null if invalid

**Example:**
```typescript
isDaylightSavingTime('2024-07-15T12:00:00', 'America/New_York')
// true (EDT in summer)

isDaylightSavingTime('2024-01-15T12:00:00', 'America/New_York')
// false (EST in winter)

isDaylightSavingTime('2024-07-15T12:00:00', 'America/Phoenix')
// false (Arizona doesn't observe DST)
```

---

## Common Use Cases

### 1. Creating Events from User Input

```typescript
// User creates event in their local timezone
const eventData = {
  title: 'Team Meeting',
  date: '2024-10-15',
  startTime: '09:00',
  endTime: '10:00',
  timezone: getUserTimezone() // User's timezone
}

// Convert to UTC for storage
const startUtc = combineDateTimeToUtc(
  eventData.date,
  eventData.startTime,
  eventData.timezone
)

const endUtc = combineDateTimeToUtc(
  eventData.date,
  eventData.endTime,
  eventData.timezone
)

// Store in database
await prisma.task.create({
  data: {
    title: eventData.title,
    startTime: startUtc!.toJSDate(),
    endTime: endUtc!.toJSDate(),
    timezone: eventData.timezone
  }
})
```

### 2. Displaying Events to Users

```typescript
// Fetch event from database (stored in UTC)
const task = await prisma.task.findUnique({ where: { id } })

// Convert to user's timezone
const userTz = getUserTimezone()
const { date, time: startTime } = extractDateTimeFromUtc(task.startTime, userTz)!
const { time: endTime } = extractDateTimeFromUtc(task.endTime, userTz)!

// Display to user
console.log(`${task.title} on ${date} from ${startTime} to ${endTime}`)
// "Team Meeting on 2024-10-15 from 09:00 to 10:00"
```

### 3. Recurring Events Across Timezones

```typescript
// Event created in New York: Daily at 9 AM EST
const eventTz = 'America/New_York'
const seedTime = combineDateTimeToUtc('2024-10-01', '09:00', eventTz)

// User in Los Angeles views the event
const viewerTz = 'America/Los_Angeles'
const viewerTime = utcToTimezone(seedTime!.toISO()!, viewerTz)

console.log(`Event time in LA: ${viewerTime!.toFormat('h:mm a')}`)
// "Event time in LA: 6:00 AM"
```

### 4. Handling DST Transitions

```typescript
// Check if an event time is affected by DST
const eventTime = '2024-03-10T07:00:00' // DST transition day
const tz = 'America/New_York'

const isDst = isDaylightSavingTime(eventTime, tz)
const offset = getTimezoneOffset(eventTime, tz)

console.log(`DST active: ${isDst}, Offset: ${offset} minutes`)
// "DST active: true, Offset: -240 minutes"
```

### 5. Validating User Input

```typescript
function validateEventInput(data: {
  date: string
  time: string
  timezone: string
}) {
  // Validate timezone
  if (!isValidTimezone(data.timezone)) {
    throw new Error('Invalid timezone')
  }
  
  // Try to combine and convert
  const utc = combineDateTimeToUtc(data.date, data.time, data.timezone)
  
  if (!utc) {
    throw new Error('Invalid date or time')
  }
  
  return utc
}
```

---

## Error Handling

All functions return `null` on error and log detailed error messages to the console. Always check for null returns:

```typescript
const result = utcToTimezone(utcTime, timezone)

if (!result) {
  console.error('Failed to convert timezone')
  // Handle error
  return
}

// Use result safely
console.log(result.hour)
```

---

## Best Practices

### 1. Always Store UTC in Database

```typescript
// ✅ Good: Store UTC, keep timezone separately
{
  startTime: DateTime,  // UTC
  timezone: String      // 'America/New_York'
}

// ❌ Bad: Store local time without timezone info
{
  startTime: DateTime  // Ambiguous!
}
```

### 2. Convert at Display Time

```typescript
// ✅ Good: Convert when displaying to user
const userTz = getUserTimezone()
const displayTime = utcToTimezone(task.startTime, userTz)

// ❌ Bad: Store in user's timezone
// (breaks when user changes timezone or views from different location)
```

### 3. Use IANA Timezone Names

```typescript
// ✅ Good: IANA names
'America/New_York'
'Europe/London'
'Asia/Tokyo'

// ❌ Bad: Abbreviations (ambiguous, not supported)
'EST'  // Could be US Eastern or Australian Eastern
'PST'
'GMT'
```

### 4. Handle Null Returns

```typescript
// ✅ Good: Check for null
const result = combineDateTimeToUtc(date, time, tz)
if (!result) {
  return { error: 'Invalid date/time' }
}

// ❌ Bad: Assume success
const result = combineDateTimeToUtc(date, time, tz)
return result.toISO() // Crashes if null!
```

---

## Testing

Run the test suite:

```bash
npm test lib/timezone-utils.test.ts
```

The test suite covers:
- Basic conversions (UTC ↔ timezone)
- Cross-timezone conversions
- Date/time combination and extraction
- Validation functions
- Edge cases (DST transitions, leap seconds, far dates)
- Error handling

---

## References

- [Luxon Documentation](https://moment.github.io/luxon/)
- [IANA Timezone Database](https://www.iana.org/time-zones)
- [List of IANA Timezones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
