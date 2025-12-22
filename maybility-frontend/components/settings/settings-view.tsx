"use client"

import { useState, useEffect, useCallback } from "react"
import { Settings, Palette, Bot, Clock, Search, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { UserSettings } from "@/lib/types"
import { AgentSettings } from "./sections/agent-settings"
import { ThemeSettings } from "./sections/theme-settings"
import { GeneralSettings } from "./sections/general-settings"
import { PromptEditor } from "./sections/prompt-editor"

type SettingsSection = "general" | "agent" | "prompts" | "theme"

const SECTIONS = [
  { id: "general" as const, label: "General", icon: Settings },
  { id: "agent" as const, label: "AI Agent", icon: Bot },
  { id: "prompts" as const, label: "Prompts", icon: FileText },
  { id: "theme" as const, label: "Appearance", icon: Palette },
]

export function SettingsView() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [activeSection, setActiveSection] = useState<SettingsSection>("general")
  const [searchQuery, setSearchQuery] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then(setSettings)
      .catch(console.error)
  }, [])

  const handleUpdate = useCallback(
    async (updates: Partial<UserSettings>) => {
      if (!settings) return

      const newSettings = { ...settings, ...updates }
      setSettings(newSettings)
      setIsSaving(true)

      try {
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })
      } catch (error) {
        console.error("Failed to save settings:", error)
      } finally {
        setIsSaving(false)
      }
    },
    [settings]
  )

  // Filter sections based on search
  const filteredSections = SECTIONS.filter((section) =>
    section.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!settings) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading settings...
      </div>
    )
  }

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-56 border-r border-border/50 bg-card/30 p-4 flex flex-col">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Sections */}
        <nav className="space-y-1 flex-1">
          {filteredSections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                activeSection === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* Saving indicator */}
        {isSaving && (
          <div className="text-xs text-muted-foreground text-center py-2">
            Saving...
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl">
          {activeSection === "general" && (
            <GeneralSettings settings={settings} onUpdate={handleUpdate} />
          )}
          {activeSection === "agent" && (
            <AgentSettings settings={settings} onUpdate={handleUpdate} />
          )}
          {activeSection === "prompts" && (
            <PromptEditor settings={settings} onUpdate={handleUpdate} />
          )}
          {activeSection === "theme" && (
            <ThemeSettings settings={settings} onUpdate={handleUpdate} />
          )}
        </div>
      </div>
    </div>
  )
}
