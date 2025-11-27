"use client"

import type React from "react"

import { cn } from "@/lib/utils"
import type { ViewMode } from "@/lib/types"
import { BookOpen, Clock, MessageSquare, Plus, Target } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NavigationBarProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
  onToggleChat: () => void
  isChatOpen: boolean
  onNewEntry: () => void
}

export function NavigationBar({ currentView, onViewChange, onToggleChat, isChatOpen, onNewEntry }: NavigationBarProps) {
  const views: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: "journal", label: "Journal", icon: <BookOpen className="h-4 w-4" /> },
    { id: "time", label: "Time", icon: <Clock className="h-4 w-4" /> },
    { id: "goals", label: "Goals", icon: <Target className="h-4 w-4" /> },
  ]

  return (
    <nav className="flex items-center justify-between border-b border-border/50 bg-card/50 px-4 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-1">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              currentView === view.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {view.icon}
            {view.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={onNewEntry} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New Entry
        </Button>

        <button
          onClick={onToggleChat}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            isChatOpen
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <MessageSquare className="h-4 w-4" />
          AI Chat
        </button>
      </div>
    </nav>
  )
}
