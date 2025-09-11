import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from "date-fns"
import type { ViewType } from "@/types/calendar-types"

export interface DateBounds {
  startDate: Date
  endDate: Date
  bufferStartDate: Date
  bufferEndDate: Date
}

/**
 * Calculate date bounds for RRULE expansion based on calendar view
 * Includes buffer periods to ensure smooth navigation
 */
export function getViewDateBounds(currentDate: Date, view: ViewType): DateBounds {
  let startDate: Date
  let endDate: Date
  let bufferStartDate: Date
  let bufferEndDate: Date

  switch (view) {
    case "day":
      // Day view: current day with 1 week buffer on each side
      startDate = new Date(currentDate)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(currentDate)
      endDate.setHours(23, 59, 59, 999)
      
      bufferStartDate = subWeeks(startDate, 1)
      bufferEndDate = addWeeks(endDate, 1)
      break

    case "week":
      // Week view: current week with 2 weeks buffer on each side
      startDate = startOfWeek(currentDate)
      endDate = endOfWeek(currentDate)
      
      bufferStartDate = subWeeks(startDate, 2)
      bufferEndDate = addWeeks(endDate, 2)
      break

    case "month":
    default:
      // Month view: current month with 1 month buffer on each side
      startDate = startOfMonth(currentDate)
      endDate = endOfMonth(currentDate)
      
      bufferStartDate = subMonths(startDate, 1)
      bufferEndDate = addMonths(endDate, 1)
      break
  }

  return {
    startDate,
    endDate,
    bufferStartDate,
    bufferEndDate
  }
}

/**
 * Get expanded bounds for RRULE generation (uses buffer dates)
 */
export function getExpandedBounds(currentDate: Date, view: ViewType): { startDate: Date; endDate: Date } {
  const bounds = getViewDateBounds(currentDate, view)
  return {
    startDate: bounds.bufferStartDate,
    endDate: bounds.bufferEndDate
  }
}

/**
 * Check if a date is within the visible bounds (not buffer)
 */
export function isDateInVisibleBounds(date: Date, currentDate: Date, view: ViewType): boolean {
  const bounds = getViewDateBounds(currentDate, view)
  return date >= bounds.startDate && date <= bounds.endDate
}
