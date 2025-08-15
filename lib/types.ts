export type DailyRecap = {
  feeling: string
  wins: string
  blockers: string
  summary: string
  emoji: string
}

export type CalendarEvent = {
  id: string
  title: string
  date: string // ISO date string (e.g., "2025-08-04")
  color: "green" | "terracotta" | "slate"
}

export type JournalEntry = {
  id: string
  title: string
  content: Record<string, any> // Tiptap content stored as JSON
  createdAt: string // ISO date string
}
