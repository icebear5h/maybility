# Smart Event Defaults

## Overview

The calendar now uses intelligent defaults for event times based on the current view and context. This provides a better user experience by pre-filling sensible values.

## Default Behavior by View

### Month View
**Use Case:** Creating all-day or full-day events  
**Defaults:**
- Start Time: `09:00` (9 AM)
- End Time: `17:00` (5 PM)
- Duration: 8 hours

**Rationale:** Month view is typically used for scheduling full-day events, meetings, or blocks of time. The 9-5 default represents a standard work day.

### Week View
**Use Case:** Creating meetings and appointments  
**Defaults:**
- If during business hours (8 AM - 5 PM): Current hour → Current hour + 1
- Otherwise: `09:00` → `10:00`
- Duration: 1 hour

**Rationale:** Week view is used for scheduling specific meetings. Defaulting to the current hour makes it quick to schedule "now" or "soon".

**Example:**
- User creates event at 2:30 PM → Defaults to 2:00 PM - 3:00 PM
- User creates event at 8:00 PM → Defaults to 9:00 AM - 10:00 AM (next day)

### Day View
**Use Case:** Detailed time management  
**Defaults:**
- Rounds to next 30-minute block
- Duration: 1 hour

**Rationale:** Day view is for precise scheduling. Rounding to 30-minute blocks keeps the calendar organized.

**Example:**
- Current time is 2:15 PM → Defaults to 2:30 PM - 3:30 PM
- Current time is 2:45 PM → Defaults to 3:00 PM - 4:00 PM

## Clicked Time Override

When a user clicks a specific time slot (week/day view), that time is used directly:

```typescript
// User clicks 10:30 AM slot
startTime: "10:30"
endTime: "11:30"  // +1 hour
```

## Minimum Duration

All events have a **minimum duration of 30 minutes**. If the end time is before or equal to the start time, it's automatically adjusted:

```typescript
// User sets: 2:00 PM - 1:00 PM (invalid)
// System corrects to: 2:00 PM - 2:30 PM
```

## Implementation

### Core Function: `getDefaultEventTimes()`

```typescript
function getDefaultEventTimes(
  view: ViewType,
  clickedTime?: string
): { startTime: string; endTime: string }
```

**Parameters:**
- `view`: Current calendar view (`month`, `week`, `day`)
- `clickedTime`: Optional time from click (HH:MM format)

**Returns:**
- `startTime`: Default start time (HH:MM)
- `endTime`: Default end time (HH:MM)

### Helper Functions

**`calculateEndTime(startTime, durationMinutes)`**
- Calculates end time given start + duration
- Handles day overflow (wraps to next day)

**`ensureValidEndTime(startTime, endTime, minDurationMinutes)`**
- Ensures end time is after start time
- Applies minimum duration if needed
- Returns adjusted end time

**`getDefaultDuration(view)`**
- Returns default duration in minutes for each view
- Month: 480 minutes (8 hours)
- Week: 60 minutes (1 hour)
- Day: 60 minutes (1 hour)

## Usage in Components

### EventModal

```typescript
<EventModal
  view={calendarState.view}  // Pass current view
  // ... other props
/>
```

The modal automatically:
1. Detects if creating new event (not editing)
2. Checks if times are empty
3. Applies smart defaults based on view
4. Validates end time is after start time

### Calendar Views

When opening the modal from a time slot:

```typescript
// Week/Day view - clicked 2:00 PM
setNewEventStartTime("14:00")
setNewEventEndTime("15:00")  // Auto-calculated
setShowEventModal(true)
```

## Examples

### Example 1: Month View - New Event
```
User: Clicks "+" in month view
System: 
  - startTime: "09:00"
  - endTime: "17:00"
  - Duration: 8 hours
```

### Example 2: Week View - Current Time
```
Current Time: 2:45 PM
User: Clicks "New Event" in week view
System:
  - startTime: "14:00" (2 PM)
  - endTime: "15:00" (3 PM)
  - Duration: 1 hour
```

### Example 3: Day View - Specific Time
```
User: Clicks 10:30 AM slot in day view
System:
  - startTime: "10:30"
  - endTime: "11:30"
  - Duration: 1 hour
```

### Example 4: Invalid End Time
```
User: Sets 2:00 PM - 1:00 PM
System: Auto-corrects to 2:00 PM - 2:30 PM
```

## Benefits

1. **Faster Event Creation** - No need to manually set times
2. **Context-Aware** - Defaults match the use case for each view
3. **Consistent** - Predictable behavior across the app
4. **Flexible** - Can still manually adjust times
5. **Smart Validation** - Prevents invalid time ranges

## Future Enhancements

### Possible Improvements:
1. **Learn from History** - Default to user's most common meeting times
2. **Business Hours** - Respect user's configured work hours
3. **Meeting Patterns** - Detect common durations (30 min, 1 hour, 2 hours)
4. **Timezone-Aware** - Adjust defaults based on user's timezone
5. **Quick Presets** - "15 min", "30 min", "1 hour", "All day" buttons

## Testing

### Test Cases:

**Month View:**
- [ ] New event defaults to 9 AM - 5 PM
- [ ] Duration is 8 hours

**Week View:**
- [ ] During business hours: Uses current hour
- [ ] Outside business hours: Defaults to 9 AM - 10 AM
- [ ] Duration is 1 hour

**Day View:**
- [ ] Rounds to next 30-minute block
- [ ] Duration is 1 hour

**Validation:**
- [ ] End time before start time → Auto-corrects
- [ ] Minimum 30-minute duration enforced
- [ ] Times wrap correctly at midnight

**Clicked Time:**
- [ ] Clicking time slot uses that time
- [ ] End time is start + 1 hour
