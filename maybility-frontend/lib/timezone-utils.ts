export function combineDateTimeToUtc(date: Date, time?: string, timezone?: string): Date {
  if (!time) return date

  const [hours, minutes] = time.split(':').map(Number)
  const combined = new Date(date)
  combined.setHours(hours, minutes, 0, 0)

  // If timezone is provided, you could do timezone conversion here
  // For now, just return the combined date
  return combined
}

export function extractDateTimeFromUtc(utcDate: Date, timezone?: string): { date: string; time: string } {
  const date = new Date(utcDate)

  const dateStr = date.toISOString().split('T')[0]
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const timeStr = `${hours}:${minutes}`

  return { date: dateStr, time: timeStr }
}

export function formatInTimezone(date: Date, timezone?: string): string {
  if (!timezone) {
    return date.toISOString()
  }

  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date)
  } catch (error) {
    return date.toISOString()
  }
}
