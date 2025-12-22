"use client"

import type React from "react"

import { cn } from "@/lib/utils"
import type { ViewMode } from "@/lib/types"
import { BookOpen, Clock, LogIn, LogOut, Target, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signIn, signOut, useSession } from "next-auth/react"
import { useFocusMode } from "../focus/focus-mode-provider"
import { FocusToolbar } from "../focus/focus-toolbar"

interface NavigationBarProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
}

export function NavigationBar({ currentView, onViewChange }: NavigationBarProps) {
  const { data: session, status } = useSession()
  const { focusLevel } = useFocusMode()

  const views: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: "journal", label: "Journal", icon: <BookOpen className="h-4 w-4" /> },
    { id: "time", label: "Time", icon: <Clock className="h-4 w-4" /> },
    { id: "goals", label: "Goals", icon: <Target className="h-4 w-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ]

  // Hide in zen mode
  if (focusLevel === "zen") return null

  // Minimal mode - just view switcher and focus toolbar
  const isMinimal = focusLevel === "minimal"

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
        <FocusToolbar />

        {!isMinimal && (
          <>
            {status === "loading" ? (
              <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
            ) : session ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => signIn("google")}
                className="gap-2"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            )}
          </>
        )}
      </div>
    </nav>
  )
}
