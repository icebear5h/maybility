import type { ViewType } from "@/types/calendar-types"

/**
 * Gets smart default times based on current view and time
 * 
 * @param view - Current calendar view
 * @param clickedTime - Optional time from click (HH:MM format)
 * @returns { startTime, endTime } in HH:MM format
 */
export function getDefaultEventTimes(
  view: ViewType,
  clickedTime?: string
): { startTime: string; endTime: string } {
  
  // If a specific time was clicked (week/day view), use it
  if (clickedTime) {
    const [hours, minutes] = clickedTime.split(':').map(Number)
    const startMinutes = hours * 60 + minutes
    const endMinutes = startMinutes + 60 // Default 1 hour duration
    
    const endHours = Math.floor(endMinutes / 60) % 24
    const endMins = endMinutes % 60
    
    return {
      startTime: clickedTime,
      endTime: `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
    }
  }
  
  // View-specific defaults
  switch (view) {
    case 'month':
      // Month view: All-day event feel (9 AM - 5 PM)
      return {
        startTime: '09:00',
        endTime: '17:00'
      }
      
    case 'week':
      // Week view: 1-hour meeting during business hours
      const now = new Date()
      const currentHour = now.getHours()
      
      // If during business hours (8 AM - 5 PM), use current hour
      if (currentHour >= 8 && currentHour < 17) {
        const startTime = `${currentHour.toString().padStart(2, '0')}:00`
        const endHour = (currentHour + 1) % 24
        const endTime = `${endHour.toString().padStart(2, '0')}:00`
        return { startTime, endTime }
      }
      
      // Otherwise default to 9 AM - 10 AM
      return {
        startTime: '09:00',
        endTime: '10:00'
      }
      
    case 'day':
      // Day view: 1-hour block at current time or next hour
      const dayNow = new Date()
      const dayHour = dayNow.getHours()
      const dayMinutes = dayNow.getMinutes()
      
      // Round to next 30-minute block
      const roundedMinutes = dayMinutes < 30 ? 30 : 0
      const roundedHour = dayMinutes < 30 ? dayHour : (dayHour + 1) % 24
      
      const dayStartTime = `${roundedHour.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`
      const dayEndHour = (roundedHour + 1) % 24
      const dayEndTime = `${dayEndHour.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`
      
      return {
        startTime: dayStartTime,
        endTime: dayEndTime
      }
      
    default:
      return {
        startTime: '09:00',
        endTime: '10:00'
      }
  }
}

/**
 * Calculates end time given a start time and duration
 * 
 * @param startTime - Start time in HH:MM format
 * @param durationMinutes - Duration in minutes (default 60)
 * @returns End time in HH:MM format
 */
export function calculateEndTime(
  startTime: string,
  durationMinutes: number = 60
): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const startMinutes = hours * 60 + minutes
  const endMinutes = startMinutes + durationMinutes
  
  const endHours = Math.floor(endMinutes / 60) % 24
  const endMins = endMinutes % 60
  
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
}

/**
 * Ensures end time is after start time, adjusting if necessary
 * 
 * @param startTime - Start time in HH:MM format
 * @param endTime - End time in HH:MM format
 * @param minDurationMinutes - Minimum duration in minutes (default 30)
 * @returns Adjusted end time in HH:MM format
 */
export function ensureValidEndTime(
  startTime: string,
  endTime: string,
  minDurationMinutes: number = 30
): string {
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  
  const startTotalMinutes = startHours * 60 + startMinutes
  const endTotalMinutes = endHours * 60 + endMinutes
  
  // If end is before or equal to start, add minimum duration
  if (endTotalMinutes <= startTotalMinutes) {
    return calculateEndTime(startTime, minDurationMinutes)
  }
  
  return endTime
}

/**
 * Gets default event duration based on view
 * 
 * @param view - Current calendar view
 * @returns Duration in minutes
 */
export function getDefaultDuration(view: ViewType): number {
  switch (view) {
    case 'month':
      return 480 // 8 hours (all-day feel)
    case 'week':
      return 60  // 1 hour
    case 'day':
      return 60  // 1 hour
    default:
      return 60
  }
}
