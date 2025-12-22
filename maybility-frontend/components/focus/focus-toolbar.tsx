"use client"

import { useFocusMode } from "./focus-mode-provider"
import { Eye, EyeOff, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function FocusToolbar() {
  const { focusLevel, setFocusLevel } = useFocusMode()

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-card/50 p-1">
      <Button
        variant={focusLevel === "off" ? "default" : "ghost"}
        size="sm"
        onClick={() => setFocusLevel("off")}
        className="gap-2"
      >
        <Eye className="h-4 w-4" />
        <span className="text-xs">Full</span>
      </Button>
      <Button
        variant={focusLevel === "minimal" ? "default" : "ghost"}
        size="sm"
        onClick={() => setFocusLevel("minimal")}
        className="gap-2"
      >
        <Minimize2 className="h-4 w-4" />
        <span className="text-xs">Minimal</span>
      </Button>
      <Button
        variant={focusLevel === "zen" ? "default" : "ghost"}
        size="sm"
        onClick={() => setFocusLevel("zen")}
        className="gap-2"
      >
        <EyeOff className="h-4 w-4" />
        <span className="text-xs">Zen</span>
      </Button>
    </div>
  )
}
