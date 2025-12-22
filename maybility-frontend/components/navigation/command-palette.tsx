"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Target, Calendar, FileText, ArrowRight, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Goal, Task, JournalEntry } from "@/lib/types"

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  goals: Goal[]
  tasks: Task[]
  entries: JournalEntry[]
  onNavigate: (view: string, item?: any) => void
}

interface Suggestion {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  action: () => void
  type: "goal" | "task" | "entry" | "view" | "ai"
  confidence?: number
}

export function CommandPalette({
  isOpen,
  onClose,
  goals,
  tasks,
  entries,
  onNavigate,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<Suggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoadingAI, setIsLoadingAI] = useState(false)

  // Generate contextual AI suggestions based on current state
  const generateAISuggestions = useCallback(async () => {
    setIsLoadingAI(true)
    try {
      // Analyze current context
      const activeTasks = tasks.filter((t) => t.taskStatus !== "DONE")
      const recentEntries = entries.slice(0, 5)
      const activeGoals = goals.filter((g) => !g.archived)

      const contextualSuggestions: Suggestion[] = []

      // Suggest going to goals with upcoming deadlines
      const goalsWithDeadlines = activeGoals
        .filter((g) => g.targetDate)
        .sort((a, b) => {
          const aDate = new Date(a.targetDate!).getTime()
          const bDate = new Date(b.targetDate!).getTime()
          return aDate - bDate
        })
        .slice(0, 2)

      goalsWithDeadlines.forEach((goal) => {
        const daysUntil = Math.ceil(
          (new Date(goal.targetDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        contextualSuggestions.push({
          id: `goal-${goal.id}`,
          title: `Focus on: ${goal.title}`,
          description: `${daysUntil} days until deadline`,
          icon: <Target className="h-4 w-4" />,
          action: () => {
            onNavigate("goals", goal)
            onClose()
          },
          type: "ai",
          confidence: 0.9,
        })
      })

      // Suggest reviewing overdue tasks
      const overdueTasks = activeTasks.filter((t) => {
        if (!t.dueDate) return false
        return new Date(t.dueDate) < new Date()
      })

      if (overdueTasks.length > 0) {
        contextualSuggestions.push({
          id: "overdue-tasks",
          title: "Review overdue tasks",
          description: `${overdueTasks.length} tasks need attention`,
          icon: <Calendar className="h-4 w-4 text-red-400" />,
          action: () => {
            onNavigate("time")
            onClose()
          },
          type: "ai",
          confidence: 0.95,
        })
      }

      // Suggest creating journal entry if none today
      const today = new Date().toDateString()
      const hasEntryToday = entries.some(
        (e) => new Date(e.createdAt).toDateString() === today
      )

      if (!hasEntryToday && new Date().getHours() >= 9) {
        contextualSuggestions.push({
          id: "create-journal",
          title: "Start today's journal",
          description: "No entry created yet today",
          icon: <FileText className="h-4 w-4" />,
          action: () => {
            onNavigate("journal")
            onClose()
          },
          type: "ai",
          confidence: 0.8,
        })
      }

      setAiSuggestions(contextualSuggestions)
    } catch (error) {
      console.error("Error generating AI suggestions:", error)
    } finally {
      setIsLoadingAI(false)
    }
  }, [goals, tasks, entries, onNavigate, onClose])

  // Generate AI suggestions on open
  useEffect(() => {
    if (isOpen) {
      generateAISuggestions()
    }
  }, [isOpen, generateAISuggestions])

  // Filter suggestions based on query
  useEffect(() => {
    if (!query) {
      const baseSuggestions: Suggestion[] = [
        {
          id: "view-goals",
          title: "View Goals",
          description: "See all your goals and progress",
          icon: <Target className="h-4 w-4" />,
          action: () => {
            onNavigate("goals")
            onClose()
          },
          type: "view",
        },
        {
          id: "view-calendar",
          title: "View Calendar",
          description: "See your schedule and events",
          icon: <Calendar className="h-4 w-4" />,
          action: () => {
            onNavigate("time")
            onClose()
          },
          type: "view",
        },
        {
          id: "view-journal",
          title: "View Journal",
          description: "Read and write journal entries",
          icon: <FileText className="h-4 w-4" />,
          action: () => {
            onNavigate("journal")
            onClose()
          },
          type: "view",
        },
      ]
      setSuggestions([...aiSuggestions, ...baseSuggestions])
      return
    }

    const lowercaseQuery = query.toLowerCase()
    const filtered: Suggestion[] = []

    // Search goals
    goals
      .filter((g) => g.title.toLowerCase().includes(lowercaseQuery))
      .slice(0, 3)
      .forEach((goal) => {
        filtered.push({
          id: `goal-${goal.id}`,
          title: goal.title,
          description: "Go to goal",
          icon: <Target className="h-4 w-4" />,
          action: () => {
            onNavigate("goals", goal)
            onClose()
          },
          type: "goal",
        })
      })

    // Search tasks
    tasks
      .filter((t) => t.title.toLowerCase().includes(lowercaseQuery))
      .slice(0, 3)
      .forEach((task) => {
        filtered.push({
          id: `task-${task.id}`,
          title: task.title,
          description: "Go to task",
          icon: <Calendar className="h-4 w-4" />,
          action: () => {
            onNavigate("time", task)
            onClose()
          },
          type: "task",
        })
      })

    // Search entries
    entries
      .filter((e) => e.title.toLowerCase().includes(lowercaseQuery))
      .slice(0, 3)
      .forEach((entry) => {
        filtered.push({
          id: `entry-${entry.id}`,
          title: entry.title,
          description: "Open journal entry",
          icon: <FileText className="h-4 w-4" />,
          action: () => {
            onNavigate("journal", entry)
            onClose()
          },
          type: "entry",
        })
      })

    setSuggestions(filtered)
  }, [query, goals, tasks, entries, aiSuggestions, onNavigate, onClose])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % suggestions.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
      } else if (e.key === "Enter") {
        e.preventDefault()
        suggestions[selectedIndex]?.action()
      } else if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, suggestions, selectedIndex, onClose])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery("")
      setSelectedIndex(0)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-20"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or type a command..."
            className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <div className="text-xs text-muted-foreground">
            <kbd className="px-2 py-1 rounded bg-muted">Esc</kbd> to close
          </div>
        </div>

        <div className="max-h-[400px] overflow-auto p-2">
          {suggestions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {isLoadingAI ? "Generating suggestions..." : "No results found"}
            </div>
          ) : (
            <>
              {!query && aiSuggestions.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    AI Suggestions
                  </div>
                </div>
              )}
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  onClick={suggestion.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                    index === selectedIndex
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/50",
                  )}
                >
                  <div
                    className={cn(
                      "rounded-lg p-2",
                      index === selectedIndex ? "bg-primary/20" : "bg-muted",
                    )}
                  >
                    {suggestion.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{suggestion.title}</div>
                      {suggestion.type === "ai" && (
                        <Sparkles className="h-3 w-3 text-primary" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {suggestion.description}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
