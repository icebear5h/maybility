# Calendar Interaction Patterns

This document defines all user interactions with the calendar system.

## 1. Click on Empty Time Slot

When the user clicks on an empty part of the calendar:

**Action**: Open `CreateEventModal` prefilled with:
- `startTime` / `endTime` or all-day date based on click
- `timezone` = user's default
- If in a Goal/Stage-focused view:
  - Pre-fill `goalId` (current goal)
  - Optionally pre-fill `stageId` (current stage)
- Offer quick templates: "Deep work session", "Review session", "Planning block"
- If focused on a Task: Pre-attach to that `taskId`

**On Cancel**: No event created, nothing changes.

## 2. Click on Existing Event

When the user clicks an existing event:

**Action**: Open `EventDetails` / `EditEventModal` showing:
- Title, description, times, recurrence, attendees, reminders, goal/stage links
- Associated context:
  - Linked Goal (title/color)
  - Linked Stage if present
  - Related Tasks and recent Updates (EVENT_NOTE, REFLECTION)

**Available Actions**:
- Edit event details
- Change status (TENTATIVE / CONFIRMED / CANCELLED)
- Attach or change goalId / stageId
- Add/edit attendees and reminders
- Open EventNoteModal to log reflection/summary
- Delete event (with confirmation)

## 3. Empty Calendar State

When the current view has no events:

**Display**: Empty state panel with:
- Message: "No events scheduled for this period"
- Primary button: "Create your first event"
- Secondary shortcuts: "Plan this goal", "Add weekly routine", "Create review block"

**On "Create first event"**:
- Opens CreateEventModal with:
  - Date range from current view
  - If scoped to a Goal, pre-fill goalId
- Show suggested template events
- Hint about click and drag functionality

## 4. Recurring Event Interactions

When user interacts with a recurring event:

**On Click**: Open EditEventModal with prompt:
- "Edit this occurrence or the entire series?"

**This occurrence only**:
- Create/update `RecurringOverride` for that `originalStart`
- Optionally create `RecurringException` if cancelling

**Entire series**:
- Edit the parent Event and its `rrule`

**Additional Behaviors**:
- "Skip this occurrence" → `RecurringException` with `isCancelled = true`
- "Change time for this occurrence" → `RecurringOverride` with `newStart`/`newEnd`
- "Change all future" → Edit series with new rrule from now forward

## 5. Drag and Drop (Moving Events)

When user drags an event to another time/day:

**Action**:
- Update `startTime` and `endTime` to new slot (preserve duration)
- Preserve `goalId` and `stageId`
- If dragged into different stage column: Update `stageId`

**For Recurring Events**:
- Prompt: "Move this occurrence only or entire series?"
  - This occurrence → create/update `RecurringOverride`
  - Entire series → shift base event times, adjust rrule

**On Conflicts**:
- Open `EventConflictResolutionDialog`:
  - Show overlapping events
  - Let user confirm, choose which to move, or cancel

## 6. Resizing (Changing Duration)

When user drags edge of event to resize:

**Action**:
- Drag bottom edge → change `endTime`
- Drag top edge → change `startTime`
- Maintain same `goalId`, `stageId`, other fields

**For Recurring Events**:
- Prompt: "Resize just this occurrence or entire series?"
  - This occurrence → `RecurringOverride` with updated times
  - Entire series → update base event duration

**On Overlap**:
- Optionally trigger `EventConflictResolutionDialog`

## Database Models Used

- **Event**: Main calendar event
- **RecurringException**: Skipped occurrences
- **RecurringOverride**: Modified single instances
- **EventAttendee**: Attendees per event
- **Reminder**: Reminders per event
- **Update**: EVENT_NOTE kind for reflections
