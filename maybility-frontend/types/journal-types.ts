import type { JournalEntry } from "@prisma/client"

export type { JournalEntry } from "@prisma/client"

export interface JournalEntryFormData {
  title: string
  content: string
  folder?: string
}

export interface JournalEntryPreview extends Omit<JournalEntry, "content"> {
  excerpt: string
}

export interface JournalFilterOptions {
  dateRange?: {
    start: string
    end: string
  }
  folder?: string
  searchQuery?: string
}

export interface JournalStats {
  totalEntries: number
  entriesThisMonth: number
  longestStreak: number
  currentStreak: number
}
