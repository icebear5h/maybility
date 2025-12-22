"use client"

import { UserSettings, AVAILABLE_MODELS } from "@/lib/types"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Props {
  settings: UserSettings
  onUpdate: (updates: Partial<UserSettings>) => void
}

export function AgentSettings({ settings, onUpdate }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">AI Agent</h2>
        <p className="text-sm text-muted-foreground">
          Configure model selection and routing behavior
        </p>
      </div>

      <div className="space-y-6">
        {/* Fast Model */}
        <div className="space-y-2">
          <Label>Fast Model (Routing & Simple Queries)</Label>
          <Select
            value={settings.fastModel}
            onValueChange={(v) => onUpdate({ fastModel: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_MODELS.fast.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Used for quick routing decisions and simple responses
          </p>
        </div>

        {/* Reasoning Model */}
        <div className="space-y-2">
          <Label>Reasoning Model (Complex Tasks)</Label>
          <Select
            value={settings.reasoningModel}
            onValueChange={(v) => onUpdate({ reasoningModel: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_MODELS.reasoning.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Used for complex planning and multi-step tasks
          </p>
        </div>

        {/* Router Threshold */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Router Threshold</Label>
            <span className="text-sm text-muted-foreground">
              {settings.routerThreshold.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[settings.routerThreshold]}
            onValueChange={([v]) => onUpdate({ routerThreshold: v })}
            min={0.1}
            max={1.0}
            step={0.05}
          />
          <p className="text-xs text-muted-foreground">
            Higher = more queries go to simple responder. Lower = more use
            complex orchestration.
          </p>
        </div>

        {/* Enable Complex Path */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Complex Orchestration</Label>
            <p className="text-xs text-muted-foreground">
              Allow multi-agent orchestration for complex tasks
            </p>
          </div>
          <button
            onClick={() =>
              onUpdate({ enableComplexPath: !settings.enableComplexPath })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enableComplexPath ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enableComplexPath ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
