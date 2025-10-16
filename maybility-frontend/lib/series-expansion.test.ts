import { describe, it, expect, beforeEach } from 'vitest'
import { DateTime } from 'luxon'
import { expandTask, expandToOccurrences, occurrenceToDisplay, occurrenceToEdit } from './series-expansion'
import type { Task, RecurringException, RecurringOverride } from '@prisma/client'
import type { ExpandedOccurrence } from './series-expansion'

describe('expandTask', () => {
  describe('SINGLE events', () => {
    it('should expand a single event within the window', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Team Meeting',
        description: 'Weekly sync',
        status: 'TODO',
        priority: 'MEDIUM',
        color: '#3b82f6',
        userId: 'user-1',
        goalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date('2024-10-10T13:00:00.000Z'), // 9 AM EST
        endTime: new Date('2024-10-10T14:00:00.000Z'),   // 10 AM EST
        timezone: 'America/New_York',
        occurrenceType: 'SINGLE',
        rrule: null,
      }

      const windowStart = '2024-10-01T00:00:00.000Z'
      const windowEnd = '2024-10-31T23:59:59.999Z'

      const occurrences = expandTask(task, windowStart, windowEnd, [], [])

      expect(occurrences).toHaveLength(1)
      expect(occurrences[0].seriesId).toBe('task-1')
      expect(occurrences[0].title).toBe('Team Meeting')
      expect(occurrences[0].source).toBe('SINGLE')
      expect(occurrences[0].startUtc).toBe('2024-10-10T13:00:00.000Z')
      expect(occurrences[0].endUtc).toBe('2024-10-10T14:00:00.000Z')
    })

    it('should not expand a single event outside the window', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Team Meeting',
        description: 'Weekly sync',
        status: 'TODO',
        priority: 'MEDIUM',
        color: '#3b82f6',
        userId: 'user-1',
        goalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date('2024-11-10T13:00:00.000Z'),
        endTime: new Date('2024-11-10T14:00:00.000Z'),
        timezone: 'America/New_York',
        occurrenceType: 'SINGLE',
        rrule: null,
      }

      const windowStart = '2024-10-01T00:00:00.000Z'
      const windowEnd = '2024-10-31T23:59:59.999Z'

      const occurrences = expandTask(task, windowStart, windowEnd, [], [])

      expect(occurrences).toHaveLength(0)
    })

    it('should handle single event with 1 hour duration', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Quick Task',
        description: null,
        status: 'TODO',
        priority: 'MEDIUM',
        color: '#3b82f6',
        userId: 'user-1',
        goalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date('2024-10-10T13:00:00.000Z'),
        endTime: new Date('2024-10-10T14:00:00.000Z'), // 1 hour duration
        timezone: 'America/New_York',
        occurrenceType: 'SINGLE',
        rrule: null,
      }

      const windowStart = '2024-10-01T00:00:00.000Z'
      const windowEnd = '2024-10-31T23:59:59.999Z'

      const occurrences = expandTask(task, windowStart, windowEnd, [], [])

      expect(occurrences).toHaveLength(1)
      // Should have 1 hour duration
      const start = DateTime.fromISO(occurrences[0].startUtc)
      const end = DateTime.fromISO(occurrences[0].endUtc)
      expect(end.diff(start, 'hours').hours).toBe(1)
    })
  })

  describe('RRULE events', () => {
    it('should expand a daily recurring event', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Daily Standup',
        description: 'Team sync',
        status: 'TODO',
        priority: 'MEDIUM',
        color: '#3b82f6',
        userId: 'user-1',
        goalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date('2024-10-01T13:00:00.000Z'), // 9 AM EST
        endTime: new Date('2024-10-01T13:30:00.000Z'),   // 9:30 AM EST
        timezone: 'America/New_York',
        occurrenceType: 'RRULE',
        rrule: 'DTSTART:20241001T130000Z\nRRULE:FREQ=DAILY;COUNT=5',
      }

      const windowStart = '2024-10-01T00:00:00.000Z'
      const windowEnd = '2024-10-31T23:59:59.999Z'

      const occurrences = expandTask(task, windowStart, windowEnd, [], [])

      expect(occurrences).toHaveLength(5)
      expect(occurrences[0].source).toBe('RRULE')
      expect(occurrences[0].title).toBe('Daily Standup')
      
      // Check that occurrences are on consecutive days
      const dates = occurrences.map(o => DateTime.fromISO(o.startUtc).toISODate())
      expect(dates).toEqual([
        '2024-10-01',
        '2024-10-02',
        '2024-10-03',
        '2024-10-04',
        '2024-10-05',
      ])
    })

    it('should expand a weekly recurring event', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Weekly Meeting',
        description: 'Team sync',
        status: 'TODO',
        priority: 'MEDIUM',
        color: '#3b82f6',
        userId: 'user-1',
        goalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date('2024-10-07T13:00:00.000Z'), // Monday 9 AM EST
        endTime: new Date('2024-10-07T14:00:00.000Z'),
        timezone: 'America/New_York',
        occurrenceType: 'RRULE',
        rrule: 'DTSTART:20241007T130000Z\nRRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=6',
      }

      const windowStart = '2024-10-01T00:00:00.000Z'
      const windowEnd = '2024-10-31T23:59:59.999Z'

      const occurrences = expandTask(task, windowStart, windowEnd, [], [])

      expect(occurrences).toHaveLength(6)
      
      // Check that occurrences are on Mon, Wed, Fri
      const weekdays = occurrences.map(o => 
        DateTime.fromISO(o.startUtc).setZone('America/New_York').weekday
      )
      weekdays.forEach(day => {
        expect([1, 3, 5]).toContain(day) // Mon=1, Wed=3, Fri=5
      })
    })

    it('should handle recurring event without rrule', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Broken Event',
        description: null,
        status: 'TODO',
        priority: 'MEDIUM',
        color: '#3b82f6',
        userId: 'user-1',
        goalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date('2024-10-10T13:00:00.000Z'),
        endTime: new Date('2024-10-10T14:00:00.000Z'),
        timezone: 'America/New_York',
        occurrenceType: 'RRULE',
        rrule: null, // Missing rrule!
      }

      const windowStart = '2024-10-01T00:00:00.000Z'
      const windowEnd = '2024-10-31T23:59:59.999Z'

      const occurrences = expandTask(task, windowStart, windowEnd, [], [])

      expect(occurrences).toHaveLength(0)
    })

    it('should handle recurring event without timezone', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Broken Event',
        description: null,
        status: 'TODO',
        priority: 'MEDIUM',
        color: '#3b82f6',
        userId: 'user-1',
        goalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date('2024-10-10T13:00:00.000Z'),
        endTime: new Date('2024-10-10T14:00:00.000Z'),
        timezone: null, // Missing timezone!
        occurrenceType: 'RRULE',
        rrule: 'DTSTART:20241010T130000Z\nRRULE:FREQ=DAILY;COUNT=5',
      }

      const windowStart = '2024-10-01T00:00:00.000Z'
      const windowEnd = '2024-10-31T23:59:59.999Z'

      const occurrences = expandTask(task, windowStart, windowEnd, [], [])

      expect(occurrences).toHaveLength(0)
    })
  })

  describe('Exceptions', () => {
    it('should skip excepted occurrences', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Daily Standup',
        description: 'Team sync',
        status: 'TODO',
        priority: 'MEDIUM',
        color: '#3b82f6',
        userId: 'user-1',
        goalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date('2024-10-01T13:00:00.000Z'),
        endTime: new Date('2024-10-01T13:30:00.000Z'),
        timezone: 'America/New_York',
        occurrenceType: 'RRULE',
        rrule: 'DTSTART:20241001T130000Z\nRRULE:FREQ=DAILY;COUNT=5',
      }

      const exceptions: RecurringException[] = [
        {
          id: 'exc-1',
          eventId: 'task-1',
          originalStart: new Date('2024-10-02T13:00:00.000Z'), // Skip Oct 2
          isCancelled: true,
        },
        {
          id: 'exc-2',
          eventId: 'task-1',
          originalStart: new Date('2024-10-04T13:00:00.000Z'), // Skip Oct 4
          isCancelled: true,
        },
      ]

      const windowStart = '2024-10-01T00:00:00.000Z'
      const windowEnd = '2024-10-31T23:59:59.999Z'

      const occurrences = expandTask(task, windowStart, windowEnd, exceptions, [])

      expect(occurrences).toHaveLength(3) // 5 - 2 exceptions
      
      const dates = occurrences.map(o => DateTime.fromISO(o.startUtc).toISODate())
      expect(dates).toEqual(['2024-10-01', '2024-10-03', '2024-10-05'])
    })
  })

  describe('Overrides', () => {
    it('should apply overrides to all occurrences', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Daily Standup',
        description: 'Team sync',
        status: 'TODO',
        priority: 'MEDIUM',
        color: '#3b82f6',
        userId: 'user-1',
        goalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date('2024-10-01T13:00:00.000Z'),
        endTime: new Date('2024-10-01T13:30:00.000Z'),
        timezone: 'America/New_York',
        occurrenceType: 'RRULE',
        rrule: 'DTSTART:20241001T130000Z\nRRULE:FREQ=DAILY;COUNT=3',
      }

      const overrides: RecurringOverride[] = [
        {
          id: 'ovr-1',
          eventId: 'task-1',
          originalStart: new Date('2024-10-01T13:00:00.000Z'),
          newStart: new Date('2024-10-02T14:00:00.000Z'), // Move to 10 AM EST
          newEnd: new Date('2024-10-02T15:00:00.000Z'),
          title: 'Rescheduled Standup',
          description: 'Moved due to conflict',
          status: 'IN_PROGRESS',
        },
      ]

      const windowStart = '2024-10-01T00:00:00.000Z'
      const windowEnd = '2024-10-31T23:59:59.999Z'

      const occurrences = expandTask(task, windowStart, windowEnd, [], overrides)

      expect(occurrences).toHaveLength(3)
      
      // With new schema, override applies to ALL occurrences
      occurrences.forEach(occ => {
        expect(occ.source).toBe('OVERRIDE')
        expect(occ.hasOverride).toBe(true)
        expect(occ.title).toBe('Rescheduled Standup')
        expect(occ.description).toBe('Moved due to conflict')
        expect(occ.status).toBe('IN_PROGRESS')
        // All occurrences get the same override times
        expect(occ.startUtc).toBe('2024-10-02T14:00:00.000Z')
        expect(occ.endUtc).toBe('2024-10-02T15:00:00.000Z')
      })
    })

    it('should apply partial overrides to all occurrences', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Daily Standup',
        description: 'Team sync',
        status: 'TODO',
        priority: 'MEDIUM',
        color: '#3b82f6',
        userId: 'user-1',
        goalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date('2024-10-01T13:00:00.000Z'),
        endTime: new Date('2024-10-01T13:30:00.000Z'),
        timezone: 'America/New_York',
        occurrenceType: 'RRULE',
        rrule: 'DTSTART:20241001T130000Z\nRRULE:FREQ=DAILY;COUNT=2',
      }

      const overrides: RecurringOverride[] = [
        {
          id: 'ovr-1',
          eventId: 'task-1',
          originalStart: new Date('2024-10-01T13:00:00.000Z'),
          newStart: null, // Don't change time
          newEnd: null,
          title: 'Updated Title Only',
          description: null,
          status: null,
        },
      ]

      const windowStart = '2024-10-01T00:00:00.000Z'
      const windowEnd = '2024-10-31T23:59:59.999Z'

      const occurrences = expandTask(task, windowStart, windowEnd, [], overrides)

      expect(occurrences).toHaveLength(2)
      
      // With new schema, override applies to ALL occurrences (not per-occurrence)
      expect(occurrences[0].title).toBe('Updated Title Only')
      expect(occurrences[0].startUtc).toBe('2024-10-01T13:00:00.000Z') // Time unchanged
      expect(occurrences[0].description).toBe('Team sync') // Original description
      
      expect(occurrences[1].title).toBe('Updated Title Only')
      expect(occurrences[1].startUtc).toBe('2024-10-02T13:00:00.000Z') // Time unchanged
      expect(occurrences[1].description).toBe('Team sync') // Original description
    })
  })
})

describe('expandToOccurrences', () => {
  it('should expand multiple tasks', () => {
    const tasks: Task[] = [
      {
        id: 'task-1',
        title: 'Single Event',
        description: null,
        status: 'TODO',
        priority: 'MEDIUM',
        color: '#3b82f6',
        userId: 'user-1',
        goalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date('2024-10-10T13:00:00.000Z'),
        endTime: new Date('2024-10-10T14:00:00.000Z'),
        timezone: 'America/New_York',
        occurrenceType: 'SINGLE',
        rrule: null,
      },
      {
        id: 'task-2',
        title: 'Recurring Event',
        description: null,
        status: 'TODO',
        priority: 'MEDIUM',
        color: '#ef4444',
        userId: 'user-1',
        goalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date('2024-10-01T13:00:00.000Z'),
        endTime: new Date('2024-10-01T13:30:00.000Z'),
        timezone: 'America/New_York',
        occurrenceType: 'RRULE',
        rrule: 'DTSTART:20241001T130000Z\nRRULE:FREQ=DAILY;COUNT=3',
      },
    ]

    const windowStart = '2024-10-01T00:00:00.000Z'
    const windowEnd = '2024-10-31T23:59:59.999Z'

    const exceptionsMap = new Map<string, RecurringException[]>()
    const overridesMap = new Map<string, RecurringOverride[]>()

    const occurrences = expandToOccurrences(
      tasks,
      windowStart,
      windowEnd,
      exceptionsMap,
      overridesMap
    )

    expect(occurrences).toHaveLength(4) // 1 single + 3 recurring
    
    // Should be sorted by start time
    for (let i = 1; i < occurrences.length; i++) {
      expect(occurrences[i].startUtc >= occurrences[i - 1].startUtc).toBe(true)
    }
  })
})

describe('occurrenceToDisplay', () => {
  it('should convert to display format in viewer timezone', () => {
    const occurrence: ExpandedOccurrence = {
      id: 'occ-1',
      seriesId: 'task-1',
      occurrenceKey: 'task-1-2024-10-10T09:00',
      startUtc: '2024-10-10T13:00:00.000Z', // 9 AM EST
      endUtc: '2024-10-10T14:00:00.000Z',   // 10 AM EST
      timezone: 'America/New_York',
      source: 'SINGLE',
      title: 'Team Meeting',
      description: 'Weekly sync',
      color: '#3b82f6',
      status: 'TODO',
      priority: 'MEDIUM',
      isException: false,
      hasOverride: false,
    }

    // Convert to PST (3 hours behind EST)
    const display = occurrenceToDisplay(occurrence, 'America/Los_Angeles')

    expect(display.id).toBe('occ-1')
    expect(display.seriesId).toBe('task-1')
    expect(display.title).toBe('Team Meeting')
    expect(display.startTime).toBe('06:00') // 9 AM EST = 6 AM PST
    expect(display.endTime).toBe('07:00')   // 10 AM EST = 7 AM PST
    expect(display.source).toBe('SINGLE')
    expect(display.timezone).toBe('America/New_York')
    
    // Date should be a JS Date object
    expect(display.date).toBeInstanceOf(Date)
  })

  it('should handle cross-day conversion', () => {
    const occurrence: ExpandedOccurrence = {
      id: 'occ-1',
      seriesId: 'task-1',
      occurrenceKey: 'task-1-2024-10-10T23:00',
      startUtc: '2024-10-11T03:00:00.000Z', // 11 PM EST on Oct 10 = 3 AM UTC on Oct 11
      endUtc: '2024-10-11T04:00:00.000Z',   // 12 AM EST on Oct 11 = 4 AM UTC on Oct 11
      timezone: 'America/New_York',
      source: 'SINGLE',
      title: 'Late Night Meeting',
      description: '',
      color: '#3b82f6',
      status: 'TODO',
      priority: 'MEDIUM',
      isException: false,
      hasOverride: false,
    }

    // Convert to Tokyo (14 hours ahead of EST during standard time)
    const display = occurrenceToDisplay(occurrence, 'Asia/Tokyo')

    expect(display.startTime).toBe('12:00') // 3 AM UTC = 12 PM JST
    expect(display.endTime).toBe('13:00')   // 4 AM UTC = 1 PM JST
    
    // Should be Oct 11 in Tokyo (same day as UTC since Tokyo is ahead)
    const displayDate = DateTime.fromJSDate(display.date).setZone('Asia/Tokyo')
    expect(displayDate.day).toBe(11)
  })
})

describe('occurrenceToEdit', () => {
  it('should convert to edit format in event timezone', () => {
    const occurrence: ExpandedOccurrence = {
      id: 'occ-1',
      seriesId: 'task-1',
      occurrenceKey: 'task-1-2024-10-10T09:00',
      startUtc: '2024-10-10T13:00:00.000Z', // 9 AM EST
      endUtc: '2024-10-10T14:00:00.000Z',   // 10 AM EST
      timezone: 'America/New_York',
      source: 'SINGLE',
      title: 'Team Meeting',
      description: 'Weekly sync',
      color: '#3b82f6',
      status: 'TODO',
      priority: 'MEDIUM',
      isException: false,
      hasOverride: false,
    }

    const edit = occurrenceToEdit(occurrence)

    expect(edit.editDate).toBe('2024-10-10')
    expect(edit.editStartTime).toBe('09:00')
    expect(edit.editEndTime).toBe('10:00')
    expect(edit.editTimezone).toBe('America/New_York')
    
    // Should preserve all original fields
    expect(edit.title).toBe('Team Meeting')
    expect(edit.seriesId).toBe('task-1')
  })
})

describe('DST and Timezone Edge Cases', () => {
  it('should handle DST transition (fall back)', () => {
    // Nov 2, 2025 at 2 AM EDT, clocks fall back to 1 AM EST
    // Note: Current implementation preserves UTC time, not wall clock time
    const task: Task = {
      id: 'dst-task',
      title: 'DST Test',
      description: null,
      status: 'TODO',
      priority: 'MEDIUM',
      color: '#3b82f6',
      userId: 'user-1',
      goalId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      startTime: new Date('2025-11-01T13:00:00.000Z'), // Nov 1, 9 AM EDT (UTC-4)
      endTime: new Date('2025-11-01T14:00:00.000Z'),
      timezone: 'America/New_York',
      occurrenceType: 'RRULE',
      rrule: 'DTSTART:20251101T130000Z\nRRULE:FREQ=DAILY;COUNT=3', // Nov 1, 2, 3
    }

    const windowStart = '2025-11-01T00:00:00.000Z'
    const windowEnd = '2025-11-03T23:59:59.999Z'

    const occurrences = expandTask(task, windowStart, windowEnd, [], [])

    expect(occurrences).toHaveLength(3)

    // Current implementation: RRule generates dates, then applies same UTC time
    // This means wall clock time shifts during DST transitions
    expect(occurrences[0].startUtc).toBe('2025-11-01T13:00:00.000Z') // 9 AM EDT
    expect(occurrences[1].startUtc).toBe('2025-11-02T13:00:00.000Z') // 8 AM EST (wall clock shifted)
    expect(occurrences[2].startUtc).toBe('2025-11-03T13:00:00.000Z') // 8 AM EST
    
    // Verify wall clock times
    const dt1 = DateTime.fromISO(occurrences[0].startUtc, { zone: 'utc' }).setZone('America/New_York')
    const dt2 = DateTime.fromISO(occurrences[1].startUtc, { zone: 'utc' }).setZone('America/New_York')
    const dt3 = DateTime.fromISO(occurrences[2].startUtc, { zone: 'utc' }).setZone('America/New_York')
    
    expect(dt1.hour).toBe(9) // 9 AM EDT
    expect(dt2.hour).toBe(8) // 8 AM EST (shifted due to DST)
    expect(dt3.hour).toBe(8) // 8 AM EST
  })

  it('should handle DST transition (spring forward)', () => {
    // Mar 9, 2025 at 2 AM EST, clocks spring forward to 3 AM EDT
    // Note: Current implementation preserves UTC time, not wall clock time
    const task: Task = {
      id: 'dst-task',
      title: 'DST Spring Test',
      description: null,
      status: 'TODO',
      priority: 'MEDIUM',
      color: '#3b82f6',
      userId: 'user-1',
      goalId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      startTime: new Date('2025-03-08T14:00:00.000Z'), // Mar 8, 9 AM EST (UTC-5)
      endTime: new Date('2025-03-08T15:00:00.000Z'),
      timezone: 'America/New_York',
      occurrenceType: 'RRULE',
      rrule: 'DTSTART:20250308T140000Z\nRRULE:FREQ=DAILY;COUNT=3', // Mar 8, 9, 10
    }

    const windowStart = '2025-03-08T00:00:00.000Z'
    const windowEnd = '2025-03-10T23:59:59.999Z'

    const occurrences = expandTask(task, windowStart, windowEnd, [], [])

    expect(occurrences).toHaveLength(3)

    // Current implementation: RRule generates dates, then applies same UTC time
    // This means wall clock time shifts during DST transitions
    expect(occurrences[0].startUtc).toBe('2025-03-08T14:00:00.000Z') // 9 AM EST
    expect(occurrences[1].startUtc).toBe('2025-03-09T14:00:00.000Z') // 10 AM EDT (wall clock shifted)
    expect(occurrences[2].startUtc).toBe('2025-03-10T14:00:00.000Z') // 10 AM EDT
    
    // Verify wall clock times
    const dt1 = DateTime.fromISO(occurrences[0].startUtc, { zone: 'utc' }).setZone('America/New_York')
    const dt2 = DateTime.fromISO(occurrences[1].startUtc, { zone: 'utc' }).setZone('America/New_York')
    const dt3 = DateTime.fromISO(occurrences[2].startUtc, { zone: 'utc' }).setZone('America/New_York')
    
    expect(dt1.hour).toBe(9)  // 9 AM EST
    expect(dt2.hour).toBe(10) // 10 AM EDT (shifted due to DST)
    expect(dt3.hour).toBe(10) // 10 AM EDT
  })

  it('should preserve wall clock time across timezones', () => {
    // Event created in NY timezone should stay at 9 AM local time
    const task: Task = {
      id: 'tz-task',
      title: 'Timezone Test',
      description: null,
      status: 'TODO',
      priority: 'MEDIUM',
      color: '#3b82f6',
      userId: 'user-1',
      goalId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      startTime: new Date('2025-10-13T13:00:00.000Z'), // 9 AM EDT
      endTime: new Date('2025-10-13T14:00:00.000Z'),
      timezone: 'America/New_York',
      occurrenceType: 'RRULE',
      rrule: 'DTSTART:20251013T130000Z\nRRULE:FREQ=DAILY;COUNT=2',
    }

    const windowStart = '2025-10-13T00:00:00.000Z'
    const windowEnd = '2025-10-15T23:59:59.999Z'

    const occurrences = expandTask(task, windowStart, windowEnd, [], [])

    // Check that all occurrences are at 9 AM in NY timezone
    occurrences.forEach(occ => {
      const localTime = DateTime.fromISO(occ.startUtc, { zone: 'utc' })
        .setZone('America/New_York')
      expect(localTime.hour).toBe(9)
      expect(localTime.minute).toBe(0)
    })
  })
})

describe('Monthly Recurrence Patterns', () => {
  it('should handle monthly by day of month', () => {
    const task: Task = {
      id: 'monthly-task',
      title: 'Monthly on 15th',
      description: null,
      status: 'TODO',
      priority: 'MEDIUM',
      color: '#3b82f6',
      userId: 'user-1',
      goalId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      startTime: new Date('2025-10-15T13:00:00.000Z'),
      endTime: new Date('2025-10-15T14:00:00.000Z'),
      timezone: 'America/New_York',
      occurrenceType: 'RRULE',
      rrule: 'DTSTART:20251015T130000Z\nRRULE:FREQ=MONTHLY;BYMONTHDAY=15;COUNT=3',
    }

    const windowStart = '2025-10-01T00:00:00.000Z'
    const windowEnd = '2025-12-31T23:59:59.999Z'

    const occurrences = expandTask(task, windowStart, windowEnd, [], [])

    expect(occurrences).toHaveLength(3)

    // Should be Oct 15, Nov 15, Dec 15
    const dates = occurrences.map(o => DateTime.fromISO(o.startUtc).setZone('America/New_York'))
    expect(dates[0].day).toBe(15)
    expect(dates[0].month).toBe(10)
    expect(dates[1].day).toBe(15)
    expect(dates[1].month).toBe(11)
    expect(dates[2].day).toBe(15)
    expect(dates[2].month).toBe(12)
  })

  it('should handle monthly by weekday (first Monday)', () => {
    const task: Task = {
      id: 'monthly-task',
      title: 'First Monday',
      description: null,
      status: 'TODO',
      priority: 'MEDIUM',
      color: '#3b82f6',
      userId: 'user-1',
      goalId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      startTime: new Date('2025-10-06T13:00:00.000Z'), // First Monday of Oct
      endTime: new Date('2025-10-06T14:00:00.000Z'),
      timezone: 'America/New_York',
      occurrenceType: 'RRULE',
      rrule: 'DTSTART:20251006T130000Z\nRRULE:FREQ=MONTHLY;BYDAY=1MO;COUNT=3',
    }

    const windowStart = '2025-10-01T00:00:00.000Z'
    const windowEnd = '2025-12-31T23:59:59.999Z'

    const occurrences = expandTask(task, windowStart, windowEnd, [], [])

    expect(occurrences).toHaveLength(3)

    // All should be Mondays
    occurrences.forEach(occ => {
      const dt = DateTime.fromISO(occ.startUtc).setZone('America/New_York')
      expect(dt.weekday).toBe(1) // Monday
    })
  })
})

describe('Occurrence Field Validation', () => {
  it('should have all required fields for SINGLE occurrence', () => {
    const task: Task = {
      id: 'task-1',
      title: 'Team Meeting',
      description: 'Weekly sync',
      status: 'TODO',
      priority: 'HIGH',
      color: '#3b82f6',
      userId: 'user-1',
      goalId: 'goal-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      startTime: new Date('2024-10-10T13:00:00.000Z'),
      endTime: new Date('2024-10-10T14:00:00.000Z'),
      timezone: 'America/New_York',
      occurrenceType: 'SINGLE',
      rrule: null,
    }

    const windowStart = '2024-10-01T00:00:00.000Z'
    const windowEnd = '2024-10-31T23:59:59.999Z'

    const occurrences = expandTask(task, windowStart, windowEnd, [], [])

    expect(occurrences).toHaveLength(1)
    const occ = occurrences[0]

    // Check all required fields exist
    expect(occ.id).toBeDefined()
    expect(occ.seriesId).toBeDefined()
    expect(occ.occurrenceKey).toBeDefined()
    expect(occ.startUtc).toBeDefined()
    expect(occ.endUtc).toBeDefined()
    expect(occ.timezone).toBeDefined()
    expect(occ.source).toBeDefined()
    expect(occ.title).toBeDefined()
    expect(occ.color).toBeDefined()
    expect(occ.status).toBeDefined()
    expect(occ.priority).toBeDefined()
    expect(occ.isException).toBeDefined()
    expect(occ.hasOverride).toBeDefined()

    // Check field values
    expect(occ.id).toBe('task-1')
    expect(occ.seriesId).toBe('task-1')
    expect(occ.occurrenceKey).toBe('task-1')
    expect(occ.startUtc).toBe('2024-10-10T13:00:00.000Z')
    expect(occ.endUtc).toBe('2024-10-10T14:00:00.000Z')
    expect(occ.timezone).toBe('America/New_York')
    expect(occ.source).toBe('SINGLE')
    expect(occ.title).toBe('Team Meeting')
    expect(occ.description).toBe('Weekly sync')
    expect(occ.color).toBe('#3b82f6')
    expect(occ.status).toBe('TODO')
    expect(occ.priority).toBe('HIGH')
    expect(occ.isException).toBe(false)
    expect(occ.hasOverride).toBe(false)
    expect(occ.rrule).toBeUndefined()
  })

  it('should have all required fields for RRULE occurrence', () => {
    const task: Task = {
      id: 'task-2',
      title: 'Daily Standup',
      description: 'Team sync',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      color: '#ef4444',
      userId: 'user-1',
      goalId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      startTime: new Date('2024-10-01T13:00:00.000Z'),
      endTime: new Date('2024-10-01T13:30:00.000Z'),
      timezone: 'America/New_York',
      occurrenceType: 'RRULE',
      rrule: 'DTSTART:20241001T130000Z\nRRULE:FREQ=DAILY;COUNT=3',
    }

    const windowStart = '2024-10-01T00:00:00.000Z'
    const windowEnd = '2024-10-31T23:59:59.999Z'

    const occurrences = expandTask(task, windowStart, windowEnd, [], [])

    expect(occurrences).toHaveLength(3)
    
    occurrences.forEach((occ, index) => {
      // Check all required fields exist
      expect(occ.id).toBeDefined()
      expect(occ.seriesId).toBeDefined()
      expect(occ.occurrenceKey).toBeDefined()
      expect(occ.startUtc).toBeDefined()
      expect(occ.endUtc).toBeDefined()
      expect(occ.timezone).toBeDefined()
      expect(occ.source).toBeDefined()
      expect(occ.title).toBeDefined()
      expect(occ.color).toBeDefined()
      expect(occ.status).toBeDefined()
      expect(occ.priority).toBeDefined()
      expect(occ.isException).toBeDefined()
      expect(occ.hasOverride).toBeDefined()

      // Check field values
      expect(occ.seriesId).toBe('task-2')
      expect(occ.timezone).toBe('America/New_York')
      expect(occ.source).toBe('RRULE')
      expect(occ.title).toBe('Daily Standup')
      expect(occ.description).toBe('Team sync')
      expect(occ.color).toBe('#ef4444')
      expect(occ.status).toBe('IN_PROGRESS')
      expect(occ.priority).toBe('MEDIUM')
      expect(occ.isException).toBe(false)
      expect(occ.hasOverride).toBe(false)

      // Each occurrence should have unique ID and occurrenceKey
      expect(occ.id).toContain('task-2-')
      expect(occ.occurrenceKey).toContain('task-2-')
      expect(occ.id).toBe(occ.occurrenceKey)

      // Verify duration is consistent (30 minutes)
      const start = DateTime.fromISO(occ.startUtc)
      const end = DateTime.fromISO(occ.endUtc)
      expect(end.diff(start, 'minutes').minutes).toBe(30)
    })

    // Verify unique IDs across occurrences
    const ids = occurrences.map(o => o.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(3)
  })

  it('should have correct fields for OVERRIDE occurrence', () => {
    const task: Task = {
      id: 'task-3',
      title: 'Original Title',
      description: 'Original description',
      status: 'TODO',
      priority: 'LOW',
      color: '#10b981',
      userId: 'user-1',
      goalId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      startTime: new Date('2024-10-01T13:00:00.000Z'),
      endTime: new Date('2024-10-01T14:00:00.000Z'),
      timezone: 'America/New_York',
      occurrenceType: 'RRULE',
      rrule: 'DTSTART:20241001T130000Z\nRRULE:FREQ=DAILY;COUNT=2',
    }

    const overrides: RecurringOverride[] = [
      {
        id: 'ovr-1',
        eventId: 'task-3',
        originalStart: new Date('2024-10-01T13:00:00.000Z'),
        newStart: new Date('2024-10-01T15:00:00.000Z'),
        newEnd: new Date('2024-10-01T16:30:00.000Z'),
        title: 'Overridden Title',
        description: 'Overridden description',
        status: 'DONE',
      },
    ]

    const windowStart = '2024-10-01T00:00:00.000Z'
    const windowEnd = '2024-10-31T23:59:59.999Z'

    const occurrences = expandTask(task, windowStart, windowEnd, [], overrides)

    expect(occurrences).toHaveLength(2)
    
    occurrences.forEach(occ => {
      // Check all required fields exist
      expect(occ.id).toBeDefined()
      expect(occ.seriesId).toBeDefined()
      expect(occ.occurrenceKey).toBeDefined()
      expect(occ.startUtc).toBeDefined()
      expect(occ.endUtc).toBeDefined()
      expect(occ.timezone).toBeDefined()
      expect(occ.source).toBeDefined()
      expect(occ.title).toBeDefined()
      expect(occ.color).toBeDefined()
      expect(occ.status).toBeDefined()
      expect(occ.priority).toBeDefined()
      expect(occ.isException).toBeDefined()
      expect(occ.hasOverride).toBeDefined()

      // Check override-specific values
      expect(occ.source).toBe('OVERRIDE')
      expect(occ.hasOverride).toBe(true)
      expect(occ.title).toBe('Overridden Title')
      expect(occ.description).toBe('Overridden description')
      expect(occ.status).toBe('DONE')
      expect(occ.startUtc).toBe('2024-10-01T15:00:00.000Z')
      expect(occ.endUtc).toBe('2024-10-01T16:30:00.000Z')
      
      // Original values should be preserved where not overridden
      expect(occ.seriesId).toBe('task-3')
      expect(occ.color).toBe('#10b981')
      expect(occ.priority).toBe('LOW')
      expect(occ.timezone).toBe('America/New_York')
    })
  })

  it('should validate occurrenceToDisplay output fields', () => {
    const occurrence: ExpandedOccurrence = {
      id: 'occ-1',
      seriesId: 'task-1',
      occurrenceKey: 'task-1-2024-10-10T09:00',
      startUtc: '2024-10-10T13:00:00.000Z',
      endUtc: '2024-10-10T14:00:00.000Z',
      timezone: 'America/New_York',
      source: 'RRULE',
      title: 'Test Event',
      description: 'Test Description',
      color: '#3b82f6',
      status: 'TODO',
      priority: 'HIGH',
      isException: false,
      hasOverride: false,
      rrule: 'FREQ=DAILY',
    }

    const display = occurrenceToDisplay(occurrence, 'America/Los_Angeles')

    // Check all required fields exist
    expect(display.id).toBeDefined()
    expect(display.seriesId).toBeDefined()
    expect(display.occurrenceKey).toBeDefined()
    expect(display.date).toBeDefined()
    expect(display.startTime).toBeDefined()
    expect(display.endTime).toBeDefined()
    expect(display.title).toBeDefined()
    expect(display.description).toBeDefined()
    expect(display.color).toBeDefined()
    expect(display.status).toBeDefined()
    expect(display.priority).toBeDefined()
    expect(display.source).toBeDefined()
    expect(display.timezone).toBeDefined()
    expect(display.hasOverride).toBeDefined()
    expect(display.isException).toBeDefined()
    expect(display.taskId).toBeDefined()

    // Check field values
    expect(display.id).toBe('occ-1')
    expect(display.seriesId).toBe('task-1')
    expect(display.occurrenceKey).toBe('task-1-2024-10-10T09:00')
    expect(display.date).toBeInstanceOf(Date)
    expect(display.startTime).toBe('06:00') // 9 AM EDT = 6 AM PDT
    expect(display.endTime).toBe('07:00')
    expect(display.title).toBe('Test Event')
    expect(display.description).toBe('Test Description')
    expect(display.color).toBe('#3b82f6')
    expect(display.status).toBe('TODO')
    expect(display.priority).toBe('HIGH')
    expect(display.source).toBe('RRULE')
    expect(display.timezone).toBe('America/New_York')
    expect(display.hasOverride).toBe(false)
    expect(display.isException).toBe(false)
    expect(display.rrule).toBe('FREQ=DAILY')
    expect(display.taskId).toBe('task-1')
  })

  it('should validate occurrenceToEdit output fields', () => {
    const occurrence: ExpandedOccurrence = {
      id: 'occ-1',
      seriesId: 'task-1',
      occurrenceKey: 'task-1-2024-10-10T09:00',
      startUtc: '2024-10-10T13:00:00.000Z',
      endUtc: '2024-10-10T15:30:00.000Z',
      timezone: 'America/New_York',
      source: 'SINGLE',
      title: 'Edit Test',
      description: 'Edit Description',
      color: '#ef4444',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      isException: false,
      hasOverride: false,
    }

    const edit = occurrenceToEdit(occurrence)

    // Check all required fields exist
    expect(edit.id).toBeDefined()
    expect(edit.seriesId).toBeDefined()
    expect(edit.occurrenceKey).toBeDefined()
    expect(edit.title).toBeDefined()
    expect(edit.description).toBeDefined()
    expect(edit.color).toBeDefined()
    expect(edit.status).toBeDefined()
    expect(edit.priority).toBeDefined()
    expect(edit.source).toBeDefined()
    expect(edit.timezone).toBeDefined()
    expect(edit.hasOverride).toBeDefined()
    expect(edit.isException).toBeDefined()
    expect(edit.editDate).toBeDefined()
    expect(edit.editStartTime).toBeDefined()
    expect(edit.editEndTime).toBeDefined()
    expect(edit.editTimezone).toBeDefined()

    // Check field values
    expect(edit.id).toBe('occ-1')
    expect(edit.seriesId).toBe('task-1')
    expect(edit.occurrenceKey).toBe('task-1-2024-10-10T09:00')
    expect(edit.title).toBe('Edit Test')
    expect(edit.description).toBe('Edit Description')
    expect(edit.color).toBe('#ef4444')
    expect(edit.status).toBe('IN_PROGRESS')
    expect(edit.priority).toBe('MEDIUM')
    expect(edit.source).toBe('SINGLE')
    expect(edit.timezone).toBe('America/New_York')
    expect(edit.hasOverride).toBe(false)
    expect(edit.isException).toBe(false)
    expect(edit.editDate).toBe('2024-10-10')
    expect(edit.editStartTime).toBe('09:00')
    expect(edit.editEndTime).toBe('11:30')
    expect(edit.editTimezone).toBe('America/New_York')
  })
})

describe('Performance and Edge Cases', () => {
  it('should handle large COUNT values efficiently', () => {
    const task: Task = {
      id: 'large-task',
      title: 'Daily for 100 days',
      description: null,
      status: 'TODO',
      priority: 'MEDIUM',
      color: '#3b82f6',
      userId: 'user-1',
      goalId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      startTime: new Date('2025-01-01T13:00:00.000Z'),
      endTime: new Date('2025-01-01T14:00:00.000Z'),
      timezone: 'America/New_York',
      occurrenceType: 'RRULE',
      rrule: 'DTSTART:20250101T130000Z\nRRULE:FREQ=DAILY;COUNT=100',
    }

    const windowStart = '2025-01-01T00:00:00.000Z'
    const windowEnd = '2025-12-31T23:59:59.999Z'

    const startTime = Date.now()
    const occurrences = expandTask(task, windowStart, windowEnd, [], [])
    const endTime = Date.now()

    expect(occurrences).toHaveLength(100)
    expect(endTime - startTime).toBeLessThan(1000) // Should complete in < 1 second
  })

  it('should handle window boundaries correctly', () => {
    const task: Task = {
      id: 'boundary-task',
      title: 'Boundary Test',
      description: null,
      status: 'TODO',
      priority: 'MEDIUM',
      color: '#3b82f6',
      userId: 'user-1',
      goalId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      startTime: new Date('2025-10-31T23:00:00.000Z'), // Oct 31, 7 PM EDT
      endTime: new Date('2025-11-01T00:00:00.000Z'),   // Nov 1, 8 PM EDT
      timezone: 'America/New_York',
      occurrenceType: 'RRULE',
      rrule: 'DTSTART:20251031T230000Z\nRRULE:FREQ=DAILY;COUNT=3',
    }

    // Window exactly covers the events
    const windowStart = '2025-10-31T00:00:00.000Z'
    const windowEnd = '2025-11-02T23:59:59.999Z'

    const occurrences = expandTask(task, windowStart, windowEnd, [], [])

    expect(occurrences).toHaveLength(3)
  })

  it('should handle events that span midnight', () => {
    const task: Task = {
      id: 'midnight-task',
      title: 'Late Night Event',
      description: null,
      status: 'TODO',
      priority: 'MEDIUM',
      color: '#3b82f6',
      userId: 'user-1',
      goalId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      startTime: new Date('2025-10-14T03:00:00.000Z'), // Oct 13, 11 PM EDT
      endTime: new Date('2025-10-14T05:00:00.000Z'),   // Oct 14, 1 AM EDT
      timezone: 'America/New_York',
      occurrenceType: 'RRULE',
      rrule: 'DTSTART:20251014T030000Z\nRRULE:FREQ=DAILY;COUNT=2',
    }

    const windowStart = '2025-10-13T00:00:00.000Z'
    const windowEnd = '2025-10-15T23:59:59.999Z'

    const occurrences = expandTask(task, windowStart, windowEnd, [], [])

    expect(occurrences).toHaveLength(2)

    // Verify duration is preserved (2 hours)
    occurrences.forEach(occ => {
      const start = DateTime.fromISO(occ.startUtc)
      const end = DateTime.fromISO(occ.endUtc)
      expect(end.diff(start, 'hours').hours).toBe(2)
    })
  })
})
