export interface CalendarPreferences {
  defaultEventDuration?: number; // minutes
  defaultColor?: string;
  defaultPriority?: "LOW" | "MEDIUM" | "HIGH";
  workHoursStart?: string; // "09:00"
  workHoursEnd?: string; // "17:00"
  firstDayOfWeek?: 0 | 1; // 0 = Sunday, 1 = Monday
  defaultView?: "month" | "week" | "day";
  autoDeclineConflicts?: boolean;
}

export interface NotificationPreferences {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  reminderMinutesBefore?: number;
}

export interface UserPreferences {
  calendar?: CalendarPreferences;
  notifications?: NotificationPreferences;
}

export interface UserSettings {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
  timezone?: string | null;
  calendarType: "GOOGLE" | "INTERNAL";
  preferences?: UserPreferences | null;
  createdAt: Date;
  updatedAt: Date;
}
