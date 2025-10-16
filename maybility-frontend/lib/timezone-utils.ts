import { DateTime } from 'luxon'

/**
 * Timezone Utility Library
 * 
 * Provides functions for converting between UTC and local timezones using Luxon.
 * All functions handle invalid inputs gracefully and return null on error.
 */

/**
 * Converts a UTC DateTime to a specific timezone
 * 
 * @param utcTime - UTC time as ISO string or Date object
 * @param timezone - Target IANA timezone (e.g., 'America/New_York')
 * @returns DateTime in target timezone, or null if invalid
 * 
 * @example
 * utcToTimezone('2024-10-15T13:00:00.000Z', 'America/New_York')
 * // Returns DateTime representing 9:00 AM EST
 */
export function utcToTimezone(
  utcTime: string | Date,
  timezone: string
): DateTime | null {
  try {
    let dt: DateTime
    
    if (typeof utcTime === 'string') {
      dt = DateTime.fromISO(utcTime, { zone: 'utc' })
    } else {
      dt = DateTime.fromJSDate(utcTime, { zone: 'utc' })
    }
    
    if (!dt.isValid) {
      console.error('[utcToTimezone] Invalid UTC time:', utcTime, dt.invalidReason)
      return null
    }
    
    const converted = dt.setZone(timezone)
    
    if (!converted.isValid) {
      console.error('[utcToTimezone] Invalid timezone:', timezone, converted.invalidReason)
      return null
    }
    
    return converted
  } catch (error) {
    console.error('[utcToTimezone] Error:', error)
    return null
  }
}

/**
 * Converts a local time in a specific timezone to UTC
 * 
 * @param localTime - Local time as ISO string or Date object
 * @param timezone - Source IANA timezone (e.g., 'America/New_York')
 * @returns DateTime in UTC, or null if invalid
 * 
 * @example
 * timezoneToUtc('2024-10-15T09:00:00', 'America/New_York')
 * // Returns DateTime representing 1:00 PM UTC
 */
export function timezoneToUtc(
  localTime: string | Date,
  timezone: string
): DateTime | null {
  try {
    let dt: DateTime
    
    if (typeof localTime === 'string') {
      dt = DateTime.fromISO(localTime, { zone: timezone })
    } else {
      dt = DateTime.fromJSDate(localTime, { zone: timezone })
    }
    
    if (!dt.isValid) {
      console.error('[timezoneToUtc] Invalid local time:', localTime, dt.invalidReason)
      return null
    }
    
    const utc = dt.toUTC()
    
    if (!utc.isValid) {
      console.error('[timezoneToUtc] Conversion to UTC failed:', utc.invalidReason)
      return null
    }
    
    return utc
  } catch (error) {
    console.error('[timezoneToUtc] Error:', error)
    return null
  }
}

/**
 * Converts time from one timezone to another
 * 
 * @param time - Time as ISO string or Date object
 * @param fromTimezone - Source IANA timezone
 * @param toTimezone - Target IANA timezone
 * @returns DateTime in target timezone, or null if invalid
 * 
 * @example
 * convertTimezone('2024-10-15T09:00:00', 'America/New_York', 'America/Los_Angeles')
 * // Returns DateTime representing 6:00 AM PST
 */
export function convertTimezone(
  time: string | Date,
  fromTimezone: string,
  toTimezone: string
): DateTime | null {
  try {
    let dt: DateTime
    
    if (typeof time === 'string') {
      dt = DateTime.fromISO(time, { zone: fromTimezone })
    } else {
      dt = DateTime.fromJSDate(time, { zone: fromTimezone })
    }
    
    if (!dt.isValid) {
      console.error('[convertTimezone] Invalid time:', time, dt.invalidReason)
      return null
    }
    
    const converted = dt.setZone(toTimezone)
    
    if (!converted.isValid) {
      console.error('[convertTimezone] Invalid target timezone:', toTimezone, converted.invalidReason)
      return null
    }
    
    return converted
  } catch (error) {
    console.error('[convertTimezone] Error:', error)
    return null
  }
}

/**
 * Combines a date and time string in a specific timezone and converts to UTC
 * 
 * @param date - Date string (YYYY-MM-DD)
 * @param time - Time string (HH:MM or HH:MM:SS)
 * @param timezone - IANA timezone
 * @returns DateTime in UTC, or null if invalid
 * 
 * @example
 * combineDateTimeToUtc('2024-10-15', '09:00', 'America/New_York')
 * // Returns DateTime representing 1:00 PM UTC
 */
export function combineDateTimeToUtc(
  date: string,
  time: string,
  timezone: string
): DateTime | null {
  try {
    // Ensure time has seconds
    const timeWithSeconds = time.includes(':') && time.split(':').length === 2 
      ? `${time}:00` 
      : time
    
    const isoString = `${date}T${timeWithSeconds}`
    const dt = DateTime.fromISO(isoString, { zone: timezone })
    
    if (!dt.isValid) {
      console.error('[combineDateTimeToUtc] Invalid date/time:', { date, time, timezone }, dt.invalidReason)
      return null
    }
    
    return dt.toUTC()
  } catch (error) {
    console.error('[combineDateTimeToUtc] Error:', error)
    return null
  }
}

/**
 * Extracts date and time components from a UTC DateTime in a specific timezone
 * 
 * @param utcTime - UTC time as ISO string or Date object
 * @param timezone - Target IANA timezone
 * @returns Object with date (YYYY-MM-DD) and time (HH:MM) strings, or null if invalid
 * 
 * @example
 * extractDateTimeFromUtc('2024-10-15T13:00:00.000Z', 'America/New_York')
 * // Returns { date: '2024-10-15', time: '09:00' }
 */
export function extractDateTimeFromUtc(
  utcTime: string | Date,
  timezone: string
): { date: string; time: string } | null {
  try {
    const dt = utcToTimezone(utcTime, timezone)
    
    if (!dt) {
      return null
    }
    
    return {
      date: dt.toFormat('yyyy-MM-dd'),
      time: dt.toFormat('HH:mm')
    }
  } catch (error) {
    console.error('[extractDateTimeFromUtc] Error:', error)
    return null
  }
}

/**
 * Gets the current user's timezone
 * 
 * @returns IANA timezone string (e.g., 'America/New_York')
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Checks if a timezone string is valid
 * 
 * @param timezone - IANA timezone string to validate
 * @returns true if valid, false otherwise
 * 
 * @example
 * isValidTimezone('America/New_York') // true
 * isValidTimezone('Invalid/Zone') // false
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    const dt = DateTime.now().setZone(timezone)
    return dt.isValid
  } catch {
    return false
  }
}

/**
 * Formats a DateTime in a specific timezone
 * 
 * @param time - Time as ISO string or Date object
 * @param timezone - IANA timezone
 * @param format - Luxon format string (default: 'yyyy-MM-dd HH:mm')
 * @returns Formatted string, or null if invalid
 * 
 * @example
 * formatInTimezone('2024-10-15T13:00:00.000Z', 'America/New_York', 'MMM dd, yyyy h:mm a')
 * // Returns 'Oct 15, 2024 9:00 AM'
 */
export function formatInTimezone(
  time: string | Date,
  timezone: string,
  format: string = 'yyyy-MM-dd HH:mm'
): string | null {
  try {
    let dt: DateTime
    
    if (typeof time === 'string') {
      dt = DateTime.fromISO(time, { zone: 'utc' })
    } else {
      dt = DateTime.fromJSDate(time, { zone: 'utc' })
    }
    
    if (!dt.isValid) {
      console.error('[formatInTimezone] Invalid time:', time, dt.invalidReason)
      return null
    }
    
    const converted = dt.setZone(timezone)
    
    if (!converted.isValid) {
      console.error('[formatInTimezone] Invalid timezone:', timezone, converted.invalidReason)
      return null
    }
    
    return converted.toFormat(format)
  } catch (error) {
    console.error('[formatInTimezone] Error:', error)
    return null
  }
}

/**
 * Gets the timezone offset in minutes for a specific timezone at a given time
 * 
 * @param time - Time as ISO string or Date object
 * @param timezone - IANA timezone
 * @returns Offset in minutes from UTC (e.g., -240 for EDT), or null if invalid
 * 
 * @example
 * getTimezoneOffset('2024-10-15T12:00:00.000Z', 'America/New_York')
 * // Returns -240 (EDT is UTC-4)
 */
export function getTimezoneOffset(
  time: string | Date,
  timezone: string
): number | null {
  try {
    let dt: DateTime
    
    if (typeof time === 'string') {
      dt = DateTime.fromISO(time, { zone: timezone })
    } else {
      dt = DateTime.fromJSDate(time, { zone: timezone })
    }
    
    if (!dt.isValid) {
      console.error('[getTimezoneOffset] Invalid time:', time, dt.invalidReason)
      return null
    }
    
    return dt.offset
  } catch (error) {
    console.error('[getTimezoneOffset] Error:', error)
    return null
  }
}

/**
 * Converts a UTC Date object to a Date object in a specific timezone
 * (Note: JavaScript Date objects are always in UTC internally, but this adjusts the time)
 * 
 * @param utcDate - UTC Date object
 * @param timezone - Target IANA timezone
 * @returns Date object representing the local time, or null if invalid
 * 
 * @example
 * utcDateToTimezoneDate(new Date('2024-10-15T13:00:00.000Z'), 'America/New_York')
 * // Returns Date representing 9:00 AM (but stored as UTC equivalent)
 */
export function utcDateToTimezoneDate(
  utcDate: Date,
  timezone: string
): Date | null {
  try {
    const dt = DateTime.fromJSDate(utcDate, { zone: 'utc' })
    
    if (!dt.isValid) {
      console.error('[utcDateToTimezoneDate] Invalid date:', utcDate, dt.invalidReason)
      return null
    }
    
    const converted = dt.setZone(timezone)
    
    if (!converted.isValid) {
      console.error('[utcDateToTimezoneDate] Invalid timezone:', timezone, converted.invalidReason)
      return null
    }
    
    return converted.toJSDate()
  } catch (error) {
    console.error('[utcDateToTimezoneDate] Error:', error)
    return null
  }
}

/**
 * Checks if a time is in daylight saving time for a given timezone
 * 
 * @param time - Time as ISO string or Date object
 * @param timezone - IANA timezone
 * @returns true if DST is active, false otherwise, null if invalid
 * 
 * @example
 * isDaylightSavingTime('2024-07-15T12:00:00.000Z', 'America/New_York')
 * // Returns true (EDT in summer)
 */
export function isDaylightSavingTime(
  time: string | Date,
  timezone: string
): boolean | null {
  try {
    let dt: DateTime
    
    if (typeof time === 'string') {
      dt = DateTime.fromISO(time, { zone: timezone })
    } else {
      dt = DateTime.fromJSDate(time, { zone: timezone })
    }
    
    if (!dt.isValid) {
      console.error('[isDaylightSavingTime] Invalid time:', time, dt.invalidReason)
      return null
    }
    
    return dt.isInDST
  } catch (error) {
    console.error('[isDaylightSavingTime] Error:', error)
    return null
  }
}
