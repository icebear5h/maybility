import { describe, it, expect } from 'vitest'
import { occurrenceToTaskUpdate, taskToOccurrence } from './occurrence-utils'
import type { Occurrence } from '@/types/calendar-types'
import type { Task } from '@prisma/client'

describe('occurrenceToTaskUpdate', () => {
  it('should convert basic occurrence fields to task fields', () => {
    const occurrence: Partial<Occurrence> = {
      title: 'Test Event',
      description: 'Test Description',
      startTime: '09:00',
      endTime: '10:00',
    }

    const result = occurrenceToTaskUpdate(occurrence)

    expect(result.title).toBe('Test Event')
    expect(result.description).toBe('Test Description')
    expect(result.startTime).toBe('09:00')
    expect(result.endTime).toBe('10:00')
  })

  it('should convert date to dtstart', () => {
    const testDate = new Date('2025-10-15T00:00:00.000Z')
    const occurrence: Partial<Occurrence> = {
      date: testDate,
      startTime: '14:00',
      endTime: '15:00',
    }

    const result = occurrenceToTaskUpdate(occurrence)

    expect(result.startDate).toEqual(testDate)
    expect(result.startTime).toBe('14:00')
    expect(result.endTime).toBe('15:00')
  })

  it('should handle date as ISO string', () => {
    const testDate = '2025-10-15T00:00:00.000Z'
    const occurrence: Partial<Occurrence> = {
      date: testDate as any,
      startTime: '14:00',
    }

    const result = occurrenceToTaskUpdate(occurrence)

    expect(result.startDate).toEqual(new Date(testDate))
  })

  it('should handle recurring event fields', () => {
    const occurrence: Partial<Occurrence> = {
      title: 'Weekly Meeting',
      occurrenceType: 'RRULE',
      rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      startTime: '10:00',
      endTime: '11:00',
    }

    const result = occurrenceToTaskUpdate(occurrence)

    expect(result.occurrenceType).toBe('RRULE')
    expect(result.rrule).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR')
  })

  it('should handle status updates', () => {
    const occurrence: Partial<Occurrence> = {
      status: 'DONE',
    }

    const result = occurrenceToTaskUpdate(occurrence)

    expect(result.status).toBe('DONE')
  })

  it('should only include defined fields', () => {
    const occurrence: Partial<Occurrence> = {
      title: 'Test',
    }

    const result = occurrenceToTaskUpdate(occurrence)

    expect(result.title).toBe('Test')
    expect(result.description).toBeUndefined()
    expect(result.startTime).toBeUndefined()
    expect(result.endTime).toBeUndefined()
  })
})

describe('taskToOccurrence', () => {
  const mockTask: Task = {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test Description',
    status: 'TODO' as any,
    priority: 'MEDIUM' as any,
    color: '#3b82f6',
    userId: 'user-123',
    goalId: 'goal-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    timezone: 'America/New_York',
    occurrenceType: 'SINGLE' as any,
    startDate: new Date('2025-10-15T00:00:00.000Z'),
    startTime: '09:00',
    endTime: '10:00',
    rrule: null,
    endDate: null,
  }

  it('should convert task to occurrence with unique ID', () => {
    const result = taskToOccurrence(mockTask)

    expect(result.id).toContain('task-123')
    expect(result.id).toContain('2025-10-15')
    expect(result.taskId).toBe('task-123')
  })

  it('should map basic fields correctly', () => {
    const result = taskToOccurrence(mockTask)

    expect(result.title).toBe('Test Task')
    expect(result.description).toBe('Test Description')
    expect(result.color).toBe('#3b82f6')
    expect(result.status).toBe('TODO')
    expect(result.goalId).toBe('goal-123')
  })

  it('should map date and time fields', () => {
    const result = taskToOccurrence(mockTask)

    expect(result.date).toEqual(new Date('2025-10-15T00:00:00.000Z'))
    expect(result.startTime).toBe('09:00')
    expect(result.endTime).toBe('10:00')
  })

  it('should use custom occurrence date if provided', () => {
    const customDate = new Date('2025-10-20T00:00:00.000Z')
    const result = taskToOccurrence(mockTask, customDate)

    expect(result.date).toEqual(customDate)
    expect(result.id).toContain('2025-10-20')
  })

  it('should handle recurring tasks', () => {
    const recurringTask: Task = {
      ...mockTask,
      occurrenceType: 'RRULE' as any,
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
    }

    const result = taskToOccurrence(recurringTask)

    expect(result.occurrenceType).toBe('RRULE')
    expect(result.rrule).toBe('FREQ=WEEKLY;BYDAY=MO')
  })

  it('should provide default times if missing', () => {
    const taskWithoutTimes: Task = {
      ...mockTask,
      startTime: null as any,
      endTime: null as any,
    }

    const result = taskToOccurrence(taskWithoutTimes)

    expect(result.startTime).toBe('09:00')
    expect(result.endTime).toBe('10:00')
  })

  it('should handle missing goalId', () => {
    const taskWithoutGoal: Task = {
      ...mockTask,
      goalId: undefined,
    }

    const result = taskToOccurrence(taskWithoutGoal)

    expect(result.goalId).toBe('')
  })

  it('should set hasOverride to false', () => {
    const result = taskToOccurrence(mockTask)

    expect(result.hasOverride).toBe(false)
  })

  it('should handle missing description', () => {
    const taskWithoutDesc: Task = {
      ...mockTask,
      description: undefined,
    }

    const result = taskToOccurrence(taskWithoutDesc)

    expect(result.description).toBe('')
  })
})

describe('Round-trip conversion', () => {
  it('should maintain data integrity through conversion cycle', () => {
    const originalTask: Task = {
      id: 'task-456',
      title: 'Round Trip Test',
      description: 'Testing conversion',
      status: 'IN_PROGRESS' as any,
      priority: 'HIGH' as any,
      color: '#ff0000',
      userId: 'user-456',
      goalId: 'goal-456',
      createdAt: new Date(),
      updatedAt: new Date(),
      timezone: 'UTC',
      occurrenceType: 'SINGLE' as any,
      startDate: new Date('2025-11-01T00:00:00.000Z'),
      startTime: '14:30',
      endTime: '15:45',
      rrule: null,
      endDate: null,
    }

    // Task -> Occurrence
    const occurrence = taskToOccurrence(originalTask)

    // Occurrence -> Task Update
    const taskUpdate = occurrenceToTaskUpdate({
      title: occurrence.title,
      description: occurrence.description,
      date: occurrence.date,
      startTime: occurrence.startTime,
      endTime: occurrence.endTime,
      status: occurrence.status,
    })

    // Verify data integrity
    expect(taskUpdate.title).toBe(originalTask.title)
    expect(taskUpdate.description).toBe(originalTask.description)
    expect(taskUpdate.startDate).toEqual(originalTask.startDate)
    expect(taskUpdate.startTime).toBe(originalTask.startTime)
    expect(taskUpdate.endTime).toBe(originalTask.endTime)
    expect(taskUpdate.status).toBe(originalTask.status)
  })
})
