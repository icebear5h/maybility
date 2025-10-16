import { describe, it, expect } from 'vitest'
import { occurrenceToFormData, formDataToTaskUpdate } from './occurrence-utils'
import type { Occurrence, EventFormData } from '@/types/calendar-types'

describe('occurrenceToFormData', () => {
  it('should convert occurrence to form data', () => {
    const occurrence: Occurrence = {
      id: 'occ-1',
      seriesId: 'task-1',
      occurrenceKey: 'task-1-2024-10-10T09:00',
      title: 'Test Event',
      description: 'Test Description',
      date: new Date('2024-10-10T13:00:00.000Z'),
      startTime: '09:00',
      endTime: '10:00',
      color: '#3b82f6',
      status: 'TODO',
      priority: 'MEDIUM',
      source: 'SINGLE',
      timezone: 'America/New_York',
      hasOverride: false,
      isException: false,
    }

    const result = occurrenceToFormData(occurrence)

    expect(result.title).toBe('Test Event')
    expect(result.description).toBe('Test Description')
    expect(result.startTime).toBe('09:00')
    expect(result.endTime).toBe('10:00')
    expect(result.timezone).toBe('America/New_York')
    expect(result.color).toBe('#3b82f6')
    expect(result.status).toBe('TODO')
    expect(result.priority).toBe('MEDIUM')
  })
})

describe('formDataToTaskUpdate', () => {
  it('should convert form data to API request format', () => {
    const formData: EventFormData = {
      title: 'New Event',
      description: 'Event description',
      date: '2024-10-15',
      startTime: '14:00',
      endTime: '15:00',
      timezone: 'America/Los_Angeles',
      color: '#ff0000',
      status: 'TODO',
      priority: 'HIGH',
    }

    const result = formDataToTaskUpdate(formData)

    expect(result.title).toBe('New Event')
    expect(result.description).toBe('Event description')
    expect(result.date).toBe('2024-10-15')
    expect(result.startTime).toBe('14:00')
    expect(result.endTime).toBe('15:00')
    expect(result.timezone).toBe('America/Los_Angeles')
    expect(result.color).toBe('#ff0000')
    expect(result.status).toBe('TODO')
    expect(result.priority).toBe('HIGH')
  })

  it('should handle recurring events', () => {
    const formData: EventFormData = {
      title: 'Weekly Meeting',
      description: 'Team sync',
      date: '2024-10-15',
      startTime: '10:00',
      endTime: '11:00',
      timezone: 'America/New_York',
      isRecurring: true,
      rruleConfig: {
        frequency: 'WEEKLY',
        interval: 1,
        byweekday: [0, 2, 4], // Monday, Wednesday, Friday
      },
    }

    const result = formDataToTaskUpdate(formData)

    expect(result.isRecurring).toBe(true)
    expect(result.rrule).toBeDefined()
    expect(result.rrule).toContain('FREQ=WEEKLY')
  })

  it('should not include rrule for non-recurring events', () => {
    const formData: EventFormData = {
      title: 'One-time Event',
      description: 'Single occurrence',
      date: '2024-10-15',
      startTime: '10:00',
      endTime: '11:00',
      timezone: 'America/New_York',
      isRecurring: false,
    }

    const result = formDataToTaskUpdate(formData)

    expect(result.isRecurring).toBe(false)
    expect(result.rrule).toBeUndefined()
  })
})
