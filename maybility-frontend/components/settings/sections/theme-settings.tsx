"use client"

import { useEffect, useCallback } from "react"
import { UserSettings, THEME_PRESETS } from "@/lib/types"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface Props {
  settings: UserSettings
  onUpdate: (updates: Partial<UserSettings>) => void
}

export function ThemeSettings({ settings, onUpdate }: Props) {
  // Apply theme changes to CSS variables
  const applyTheme = useCallback((hue: number, chroma: number, preset?: string) => {
    const root = document.documentElement

    // Apply preset background if provided
    if (preset) {
      const presetConfig = THEME_PRESETS.find((p) => p.name === preset)
      if (presetConfig) {
        root.style.setProperty("--background", presetConfig.background)
      }
    }

    // Apply accent colors based on hue/chroma
    root.style.setProperty("--primary", `oklch(0.7 ${chroma} ${hue})`)
    root.style.setProperty("--ring", `oklch(0.7 ${chroma} ${hue})`)
    root.style.setProperty(
      "--accent",
      `oklch(0.75 ${chroma * 0.8} ${(hue + 40) % 360})`
    )
  }, [])

  // Apply theme on mount and when settings change
  useEffect(() => {
    applyTheme(settings.accentHue, settings.accentChroma, settings.themePreset)
  }, [settings.accentHue, settings.accentChroma, settings.themePreset, applyTheme])

  const handlePresetChange = (preset: string) => {
    onUpdate({ themePreset: preset })
    applyTheme(settings.accentHue, settings.accentChroma, preset)
  }

  const handleHueChange = (hue: number) => {
    onUpdate({ accentHue: hue })
    applyTheme(hue, settings.accentChroma, settings.themePreset)
  }

  const handleChromaChange = (chroma: number) => {
    onUpdate({ accentChroma: chroma })
    applyTheme(settings.accentHue, chroma, settings.themePreset)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Appearance</h2>
        <p className="text-sm text-muted-foreground">
          Customize colors and theme
        </p>
      </div>

      {/* Preset Themes */}
      <div className="space-y-3">
        <Label>Theme Preset</Label>
        <div className="grid grid-cols-3 gap-3">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePresetChange(preset.name)}
              className={cn(
                "p-3 rounded-lg border-2 text-left transition-colors",
                settings.themePreset === preset.name
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div
                className="h-8 rounded-md mb-2"
                style={{ background: preset.background }}
              />
              <span className="text-sm">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Accent Hue</Label>
            <span className="text-sm text-muted-foreground">
              {settings.accentHue}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-lg shrink-0"
              style={{
                background: `oklch(0.7 ${settings.accentChroma} ${settings.accentHue})`,
              }}
            />
            <Slider
              value={[settings.accentHue]}
              onValueChange={([v]) => handleHueChange(v)}
              min={0}
              max={360}
              step={5}
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Accent Intensity</Label>
            <span className="text-sm text-muted-foreground">
              {settings.accentChroma.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[settings.accentChroma]}
            onValueChange={([v]) => handleChromaChange(v)}
            min={0.05}
            max={0.25}
            step={0.01}
          />
        </div>
      </div>

      {/* Hue Reference */}
      <div className="space-y-2">
        <Label className="text-muted-foreground">Hue Reference</Label>
        <div
          className="h-6 rounded-md"
          style={{
            background: `linear-gradient(to right,
              oklch(0.7 0.15 0),
              oklch(0.7 0.15 60),
              oklch(0.7 0.15 120),
              oklch(0.7 0.15 180),
              oklch(0.7 0.15 240),
              oklch(0.7 0.15 300),
              oklch(0.7 0.15 360))`,
          }}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Red</span>
          <span>Yellow</span>
          <span>Green</span>
          <span>Cyan</span>
          <span>Blue</span>
          <span>Magenta</span>
          <span>Red</span>
        </div>
      </div>
    </div>
  )
}
