"use client"

import { useFocusMode } from "./focus-mode-provider"
import { Eye, EyeOff, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function FocusModeIndicator() {
  const { focusLevel, toggleFocus } = useFocusMode()

  if (focusLevel === "off") return null

  return (
    <button
      onClick={toggleFocus}
      className={cn(
        "fixed bottom-4 right-4 z-50 rounded-full p-3 shadow-lg transition-all",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "flex items-center gap-2",
      )}
    >
      {focusLevel === "minimal" && (
        <>
          <Minimize2 className="h-5 w-5" />
          <span className="text-sm font-medium">Minimal</span>
        </>
      )}
      {focusLevel === "zen" && (
        <>
          <EyeOff className="h-5 w-5" />
          <span className="text-sm font-medium">Zen</span>
        </>
      )}
      <div className="text-xs opacity-75">Press Esc</div>
    </button>
  )
}
