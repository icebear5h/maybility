"use client"

import { useState, useEffect } from "react"
import { UserSettings } from "@/lib/types"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

const PROMPTS = [
  {
    key: "customRouterPrompt" as const,
    defaultKey: "router",
    label: "Router",
    description: "Classifies incoming messages and routes to appropriate handler",
  },
  {
    key: "customSimplePrompt" as const,
    defaultKey: "simple_responder",
    label: "Simple Responder",
    description: "Handles basic queries and greetings",
  },
  {
    key: "customOrchestratorPrompt" as const,
    defaultKey: "orchestrator",
    label: "Orchestrator",
    description: "Plans and coordinates complex multi-step tasks",
  },
  {
    key: "customSynthesizerPrompt" as const,
    defaultKey: "synthesizer",
    label: "Synthesizer",
    description: "Combines results from multiple agents into final response",
  },
  {
    key: "customSetTasksPrompt" as const,
    defaultKey: "set_tasks",
    label: "Task Planner",
    description: "Breaks down goals into actionable tasks",
  },
]

type PromptKey = (typeof PROMPTS)[number]["key"]

interface Props {
  settings: UserSettings
  onUpdate: (updates: Partial<UserSettings>) => void
}

export function PromptEditor({ settings, onUpdate }: Props) {
  const [defaults, setDefaults] = useState<Record<string, string>>({})
  const [activePrompt, setActivePrompt] = useState<PromptKey>("customRouterPrompt")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/settings/prompts")
      .then((res) => res.json())
      .then((data) => {
        setDefaults(data)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  const currentPrompt = PROMPTS.find((p) => p.key === activePrompt)!
  const defaultValue = defaults[currentPrompt.defaultKey] || ""
  const currentValue = settings[activePrompt]

  const handleReset = () => {
    onUpdate({ [activePrompt]: null })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">System Prompts</h2>
        <p className="text-sm text-muted-foreground">
          Customize agent behavior. Leave blank to use defaults.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {PROMPTS.map((p) => (
          <button
            key={p.key}
            onClick={() => setActivePrompt(p.key)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              activePrompt === p.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {currentPrompt.description}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!currentValue}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset to Default
          </Button>
        </div>

        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground border rounded-md">
            Loading prompts...
          </div>
        ) : (
          <Textarea
            value={currentValue || defaultValue}
            onChange={(e) =>
              onUpdate({
                [activePrompt]: e.target.value === defaultValue ? null : e.target.value,
              })
            }
            className="min-h-[300px] font-mono text-sm"
            placeholder="Enter custom prompt..."
          />
        )}

        {currentValue && (
          <p className="text-xs text-muted-foreground">
            Using custom prompt. Reset to restore default.
          </p>
        )}
      </div>
    </div>
  )
}
