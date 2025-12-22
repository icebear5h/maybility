"use client"

import { useEffect } from "react"
import { SessionProvider, useSession } from "next-auth/react"
import { THEME_PRESETS } from "@/lib/types"

function ThemeLoader() {
  const { data: session } = useSession()

  useEffect(() => {
    if (!session) return

    fetch("/api/settings")
      .then((res) => res.json())
      .then((settings) => {
        if (!settings) return

        const root = document.documentElement

        // Apply theme preset background
        if (settings.themePreset) {
          const preset = THEME_PRESETS.find((p) => p.name === settings.themePreset)
          if (preset) {
            root.style.setProperty("--background", preset.background)
          }
        }

        // Apply accent colors
        if (settings.accentHue !== undefined && settings.accentChroma !== undefined) {
          root.style.setProperty(
            "--primary",
            `oklch(0.7 ${settings.accentChroma} ${settings.accentHue})`
          )
          root.style.setProperty(
            "--ring",
            `oklch(0.7 ${settings.accentChroma} ${settings.accentHue})`
          )
          root.style.setProperty(
            "--accent",
            `oklch(0.75 ${settings.accentChroma * 0.8} ${(settings.accentHue + 40) % 360})`
          )
        }
      })
      .catch(console.error)
  }, [session])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeLoader />
      {children}
    </SessionProvider>
  )
}
