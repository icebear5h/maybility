export type { User } from "@prisma/client"

export interface UserPreferences {
  theme?: "light" | "dark" | "system"
  timezone?: string
  dateFormat?: string
  timeFormat?: "12h" | "24h"
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  defaultCalendarView?: "day" | "week" | "month"
  defaultEventDuration?: number
  emailNotifications?: boolean
  pushNotifications?: boolean
}

export interface UserSession {
  user: {
    id: string
    name: string
    email: string
    image?: string
  }
  expires: string
  accessToken?: string
  refreshToken?: string
}
