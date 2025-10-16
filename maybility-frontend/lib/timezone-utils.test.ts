import { describe, it, expect } from 'vitest'
import { DateTime } from 'luxon'
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
} from './timezone-utils'

describe('timezone-utils', () => {
  describe('utcToTimezone', () => {
    it('should convert UTC ISO string to timezone', () => {
      const utc = '2024-10-15T13:00:00.000Z'
      const result = utcToTimezone(utc, 'America/New_York')
      
      expect(result).not.toBeNull()
      expect(result!.hour).toBe(9) // 1 PM UTC = 9 AM EDT
      expect(result!.zoneName).toBe('America/New_York')
    })

    it('should convert UTC Date object to timezone', () => {
      const utc = new Date('2024-10-15T13:00:00.000Z')
      const result = utcToTimezone(utc, 'America/Los_Angeles')
      
      expect(result).not.toBeNull()
      expect(result!.hour).toBe(6) // 1 PM UTC = 6 AM PDT
      expect(result!.zoneName).toBe('America/Los_Angeles')
    })

    it('should handle invalid UTC time', () => {
      const result = utcToTimezone('invalid-time', 'America/New_York')
      expect(result).toBeNull()
    })

    it('should handle invalid timezone', () => {
      const utc = '2024-10-15T13:00:00.000Z'
      const result = utcToTimezone(utc, 'Invalid/Timezone')
      expect(result).toBeNull()
    })
  })

  describe('timezoneToUtc', () => {
    it('should convert local ISO string to UTC', () => {
      const local = '2024-10-15T09:00:00'
      const result = timezoneToUtc(local, 'America/New_York')
      
      expect(result).not.toBeNull()
      expect(result!.hour).toBe(13) // 9 AM EDT = 1 PM UTC
      expect(result!.zoneName).toBe('UTC')
    })

    it('should convert local Date object to UTC', () => {
      // Create a date in EST context
      const local = new Date('2024-10-15T09:00:00')
      const result = timezoneToUtc(local, 'America/New_York')
      
      expect(result).not.toBeNull()
      expect(result!.zoneName).toBe('UTC')
    })

    it('should handle invalid local time', () => {
      const result = timezoneToUtc('invalid-time', 'America/New_York')
      expect(result).toBeNull()
    })
  })

  describe('convertTimezone', () => {
    it('should convert between two timezones', () => {
      const time = '2024-10-15T09:00:00'
      const result = convertTimezone(time, 'America/New_York', 'America/Los_Angeles')
      
      expect(result).not.toBeNull()
      expect(result!.hour).toBe(6) // 9 AM EDT = 6 AM PDT
      expect(result!.zoneName).toBe('America/Los_Angeles')
    })

    it('should handle Date objects', () => {
      const time = new Date('2024-10-15T09:00:00')
      const result = convertTimezone(time, 'America/New_York', 'Europe/London')
      
      expect(result).not.toBeNull()
      expect(result!.zoneName).toBe('Europe/London')
    })

    it('should handle invalid time', () => {
      const result = convertTimezone('invalid', 'America/New_York', 'America/Los_Angeles')
      expect(result).toBeNull()
    })
  })

  describe('combineDateTimeToUtc', () => {
    it('should combine date and time to UTC', () => {
      const result = combineDateTimeToUtc('2024-10-15', '09:00', 'America/New_York')
      
      expect(result).not.toBeNull()
      expect(result!.hour).toBe(13) // 9 AM EDT = 1 PM UTC
      expect(result!.zoneName).toBe('UTC')
      expect(result!.toISODate()).toBe('2024-10-15')
    })

    it('should handle time with seconds', () => {
      const result = combineDateTimeToUtc('2024-10-15', '09:30:45', 'America/New_York')
      
      expect(result).not.toBeNull()
      expect(result!.hour).toBe(13)
      expect(result!.minute).toBe(30)
      expect(result!.second).toBe(45)
    })

    it('should handle invalid date', () => {
      const result = combineDateTimeToUtc('invalid-date', '09:00', 'America/New_York')
      expect(result).toBeNull()
    })

    it('should handle invalid time', () => {
      const result = combineDateTimeToUtc('2024-10-15', 'invalid', 'America/New_York')
      expect(result).toBeNull()
    })
  })

  describe('extractDateTimeFromUtc', () => {
    it('should extract date and time from UTC string', () => {
      const result = extractDateTimeFromUtc('2024-10-15T13:00:00.000Z', 'America/New_York')
      
      expect(result).not.toBeNull()
      expect(result!.date).toBe('2024-10-15')
      expect(result!.time).toBe('09:00')
    })

    it('should extract date and time from UTC Date', () => {
      const utc = new Date('2024-10-15T13:00:00.000Z')
      const result = extractDateTimeFromUtc(utc, 'America/Los_Angeles')
      
      expect(result).not.toBeNull()
      expect(result!.date).toBe('2024-10-15')
      expect(result!.time).toBe('06:00')
    })

    it('should handle cross-day conversion', () => {
      // 3 AM UTC on Oct 16 = 11 PM EDT on Oct 15
      const result = extractDateTimeFromUtc('2024-10-16T03:00:00.000Z', 'America/New_York')
      
      expect(result).not.toBeNull()
      expect(result!.date).toBe('2024-10-15') // Previous day
      expect(result!.time).toBe('23:00')
    })

    it('should handle invalid UTC time', () => {
      const result = extractDateTimeFromUtc('invalid', 'America/New_York')
      expect(result).toBeNull()
    })
  })

  describe('getUserTimezone', () => {
    it('should return a valid timezone string', () => {
      const tz = getUserTimezone()
      
      expect(tz).toBeTruthy()
      expect(typeof tz).toBe('string')
      expect(isValidTimezone(tz)).toBe(true)
    })
  })

  describe('isValidTimezone', () => {
    it('should validate correct timezones', () => {
      expect(isValidTimezone('America/New_York')).toBe(true)
      expect(isValidTimezone('Europe/London')).toBe(true)
      expect(isValidTimezone('Asia/Tokyo')).toBe(true)
      expect(isValidTimezone('UTC')).toBe(true)
    })

    it('should reject invalid timezones', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false)
      // Note: Luxon actually accepts 'EST' as valid, so we skip this test
      // expect(isValidTimezone('EST')).toBe(false)
      expect(isValidTimezone('')).toBe(false)
    })
  })

  describe('formatInTimezone', () => {
    it('should format UTC time in timezone with default format', () => {
      const result = formatInTimezone('2024-10-15T13:00:00.000Z', 'America/New_York')
      
      expect(result).toBe('2024-10-15 09:00')
    })

    it('should format with custom format', () => {
      const result = formatInTimezone(
        '2024-10-15T13:00:00.000Z',
        'America/New_York',
        'MMM dd, yyyy h:mm a'
      )
      
      expect(result).toBe('Oct 15, 2024 9:00 AM')
    })

    it('should handle Date objects', () => {
      const date = new Date('2024-10-15T13:00:00.000Z')
      const result = formatInTimezone(date, 'America/Los_Angeles', 'HH:mm')
      
      expect(result).toBe('06:00')
    })

    it('should handle invalid time', () => {
      const result = formatInTimezone('invalid', 'America/New_York')
      expect(result).toBeNull()
    })
  })

  describe('getTimezoneOffset', () => {
    it('should get offset for EDT (UTC-4)', () => {
      // October 15, 2024 is in EDT
      const result = getTimezoneOffset('2024-10-15T12:00:00', 'America/New_York')
      
      expect(result).toBe(-240) // -4 hours = -240 minutes
    })

    it('should get offset for PST (UTC-8)', () => {
      // January is in PST
      const result = getTimezoneOffset('2024-01-15T12:00:00', 'America/Los_Angeles')
      
      expect(result).toBe(-480) // -8 hours = -480 minutes
    })

    it('should get offset for UTC', () => {
      const result = getTimezoneOffset('2024-10-15T12:00:00', 'UTC')
      
      expect(result).toBe(0)
    })

    it('should handle Date objects', () => {
      const date = new Date('2024-10-15T12:00:00')
      const result = getTimezoneOffset(date, 'America/New_York')
      
      expect(result).not.toBeNull()
      expect(typeof result).toBe('number')
    })

    it('should handle invalid time', () => {
      const result = getTimezoneOffset('invalid', 'America/New_York')
      expect(result).toBeNull()
    })
  })

  describe('utcDateToTimezoneDate', () => {
    it('should convert UTC Date to timezone Date', () => {
      const utc = new Date('2024-10-15T13:00:00.000Z')
      const result = utcDateToTimezoneDate(utc, 'America/New_York')
      
      expect(result).not.toBeNull()
      expect(result).toBeInstanceOf(Date)
      
      // The Date object should represent 9 AM
      const dt = DateTime.fromJSDate(result!, { zone: 'America/New_York' })
      expect(dt.hour).toBe(9)
    })

    it('should handle invalid date', () => {
      const invalid = new Date('invalid')
      const result = utcDateToTimezoneDate(invalid, 'America/New_York')
      expect(result).toBeNull()
    })

    it('should handle invalid timezone', () => {
      const utc = new Date('2024-10-15T13:00:00.000Z')
      const result = utcDateToTimezoneDate(utc, 'Invalid/Timezone')
      expect(result).toBeNull()
    })
  })

  describe('isDaylightSavingTime', () => {
    it('should detect DST in summer', () => {
      // July is in EDT (DST)
      const result = isDaylightSavingTime('2024-07-15T12:00:00', 'America/New_York')
      expect(result).toBe(true)
    })

    it('should detect no DST in winter', () => {
      // January is in EST (no DST)
      const result = isDaylightSavingTime('2024-01-15T12:00:00', 'America/New_York')
      expect(result).toBe(false)
    })

    it('should handle timezones without DST', () => {
      // Arizona does not observe DST
      const result = isDaylightSavingTime('2024-07-15T12:00:00', 'America/Phoenix')
      expect(result).toBe(false)
    })

    it('should handle Date objects', () => {
      const date = new Date('2024-07-15T12:00:00')
      const result = isDaylightSavingTime(date, 'America/New_York')
      expect(result).toBe(true)
    })

    it('should handle invalid time', () => {
      const result = isDaylightSavingTime('invalid', 'America/New_York')
      expect(result).toBeNull()
    })
  })

  describe('Round-trip conversions', () => {
    it('should preserve original local time after local → UTC → local conversion', () => {
      const originalDate = '2024-10-15'
      const originalTime = '14:35'
      const timezone = 'America/New_York'
      
      // Step 1: Combine date and time, convert to UTC
      const localDateTime = `${originalDate}T${originalTime}`
      const utc = timezoneToUtc(localDateTime, timezone)
      
      expect(utc).not.toBeNull()
      
      // Step 2: Convert back to local timezone
      const utcISO = utc!.toISO()
      expect(utcISO).not.toBeNull()
      
      const backToLocal = utcToTimezone(utcISO!, timezone)
      
      expect(backToLocal).not.toBeNull()
      expect(backToLocal!.toFormat('yyyy-MM-dd')).toBe(originalDate)
      expect(backToLocal!.toFormat('HH:mm')).toBe(originalTime)
    })

    it('should preserve original time across multiple timezones', () => {
      const testCases = [
        { date: '2024-10-15', time: '09:00', tz: 'America/New_York' },
        { date: '2024-10-15', time: '14:35', tz: 'America/Los_Angeles' },
        { date: '2024-10-15', time: '23:59', tz: 'Europe/London' },
        { date: '2024-10-15', time: '00:00', tz: 'Asia/Tokyo' },
      ]
      
      testCases.forEach(({ date, time, tz }) => {
        const localDateTime = `${date}T${time}`
        const utc = timezoneToUtc(localDateTime, tz)
        expect(utc).not.toBeNull()
        
        const utcISO = utc!.toISO()
        const backToLocal = utcToTimezone(utcISO!, tz)
        
        expect(backToLocal).not.toBeNull()
        expect(backToLocal!.toFormat('yyyy-MM-dd')).toBe(date)
        expect(backToLocal!.toFormat('HH:mm')).toBe(time)
      })
    })

    it('should handle cross-day boundary conversions correctly', () => {
      // 11:00 PM EST converts to next day in UTC, but should round-trip correctly
      const originalDate = '2024-10-15'
      const originalTime = '23:00'
      const timezone = 'America/New_York'
      
      const localDateTime = `${originalDate}T${originalTime}`
      const utc = timezoneToUtc(localDateTime, timezone)
      
      expect(utc).not.toBeNull()
      // UTC should be next day (Oct 16 at 3:00 AM UTC)
      expect(utc!.day).toBe(16)
      expect(utc!.hour).toBe(3)
      
      // But when converted back, should match original
      const utcISO = utc!.toISO()
      const backToLocal = utcToTimezone(utcISO!, timezone)
      
      expect(backToLocal).not.toBeNull()
      expect(backToLocal!.toFormat('yyyy-MM-dd')).toBe(originalDate)
      expect(backToLocal!.toFormat('HH:mm')).toBe(originalTime)
    })

    it('should verify the exact workflow used in handleUpdateEvent', () => {
      // Simulate the exact flow from the calendar app
      const updates = {
        startDate: '2024-10-15',
        startTime: '14:35',
        endTime: '15:35'
      }
      const viewerTz = 'America/New_York'
      
      // Convert to UTC (as done in handleUpdateEvent)
      const localStart = updates.startDate + "T" + updates.startTime
      const localEnd = updates.startDate + "T" + updates.endTime
      const utcStart = timezoneToUtc(localStart, viewerTz)
      const utcEnd = timezoneToUtc(localEnd, viewerTz)
      
      expect(utcStart).not.toBeNull()
      expect(utcEnd).not.toBeNull()
      
      const utcStartISO = utcStart!.toISO()
      const utcEndISO = utcEnd!.toISO()
      
      expect(utcStartISO).not.toBeNull()
      expect(utcEndISO).not.toBeNull()
      
      // Verify these are full ISO strings, not just time portions
      // UTC format ends with 'Z' instead of timezone offset
      expect(utcStartISO).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(Z|[+-]\d{2}:\d{2})$/)
      expect(utcEndISO).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(Z|[+-]\d{2}:\d{2})$/)
      
      // Convert back to verify round-trip
      const backToLocalStart = utcToTimezone(utcStartISO!, viewerTz)
      const backToLocalEnd = utcToTimezone(utcEndISO!, viewerTz)
      
      expect(backToLocalStart).not.toBeNull()
      expect(backToLocalEnd).not.toBeNull()
      expect(backToLocalStart!.toFormat('HH:mm')).toBe(updates.startTime)
      expect(backToLocalEnd!.toFormat('HH:mm')).toBe(updates.endTime)
    })
  })

  describe('Edge cases', () => {
    it('should handle timezone transitions (DST boundary)', () => {
      // March 10, 2024 at 2 AM EDT is when DST starts
      const beforeDst = '2024-03-10T06:59:00.000Z' // 1:59 AM EST
      const afterDst = '2024-03-10T07:01:00.000Z'  // 3:01 AM EDT
      
      const before = utcToTimezone(beforeDst, 'America/New_York')
      const after = utcToTimezone(afterDst, 'America/New_York')
      
      expect(before!.hour).toBe(1)
      expect(after!.hour).toBe(3) // 2 AM doesn't exist, jumps to 3 AM
    })

    it('should handle leap seconds gracefully', () => {
      // Luxon doesn't support leap seconds (seconds > 59 are invalid)
      // This is expected behavior - leap seconds are not part of ISO 8601
      const result = utcToTimezone('2024-12-31T23:59:60.000Z', 'UTC')
      expect(result).toBeNull() // Invalid input
    })

    it('should handle far future dates', () => {
      const result = combineDateTimeToUtc('2099-12-31', '23:59', 'America/New_York')
      expect(result).not.toBeNull()
      // When converted to UTC, 23:59 EST on Dec 31 becomes next day (Jan 1, 2100)
      expect(result!.year).toBe(2100)
      expect(result!.month).toBe(1)
      expect(result!.day).toBe(1)
    })

    it('should handle far past dates', () => {
      const result = combineDateTimeToUtc('1900-01-01', '00:00', 'America/New_York')
      expect(result).not.toBeNull()
      expect(result!.year).toBe(1900)
    })
  })
})
