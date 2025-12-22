"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

type FocusLevel = "off" | "minimal" | "zen"

interface FocusContextType {
  focusLevel: FocusLevel
  setFocusLevel: (level: FocusLevel) => void
  toggleFocus: () => void
  focusTarget: any | null
  setFocusTarget: (target: any) => void
}

const FocusContext = createContext<FocusContextType | undefined>(undefined)

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [focusLevel, setFocusLevel] = useState<FocusLevel>("off")
  const [focusTarget, setFocusTarget] = useState<any | null>(null)

  // Keyboard shortcut: Cmd+Shift+F to cycle through focus modes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault()
        toggleFocus()
      }
      // Escape to exit focus mode
      if (e.key === 'Escape' && focusLevel !== "off") {
        e.preventDefault()
        setFocusLevel("off")
        setFocusTarget(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusLevel])

  const toggleFocus = () => {
    setFocusLevel((prev) => {
      if (prev === "off") return "minimal"
      if (prev === "minimal") return "zen"
      return "off"
    })
  }

  return (
    <FocusContext.Provider
      value={{
        focusLevel,
        setFocusLevel,
        toggleFocus,
        focusTarget,
        setFocusTarget,
      }}
    >
      {children}
    </FocusContext.Provider>
  )
}

export function useFocusMode() {
  const context = useContext(FocusContext)
  if (!context) {
    throw new Error("useFocusMode must be used within FocusModeProvider")
  }
  return context
}
