// time.ts
import { format as fmt } from "date-fns"
import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz'

// local wall time → UTC
const startUtcISO = fromZonedTime('2025-08-04T09:00:00', 'America/Los_Angeles').toISOString()

// UTC → local wall time
const wallDate = toZonedTime('2025-08-04T16:00:00Z', 'America/Los_Angeles')

export type Tz = string // e.g. "America/Los_Angeles"

export const toUtcISO = (dateYYYYMMDD: string, hhmm: string, tz: Tz) => {
  // Build local wall-time ISO like "2025-08-04T09:00:00"
  const localISO = `${dateYYYYMMDD}T${hhmm}:00`
  return fromZonedTime(localISO, tz).toISOString()
}

export const fromUtcISO = (utcISO: string, tz: Tz) => {
  const z = toZonedTime(new Date(utcISO), tz)
  const date = fmt(z, "yyyy-MM-dd")
  const time = fmt(z, "HH:mm")
  return { date, time }
}

export const timeToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}
export const minutesToTime = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`

export const deriveEndTime = (startHHMM: string, durationMin: number) =>
  minutesToTime(Math.min(24 * 60, timeToMinutes(startHHMM) + durationMin))