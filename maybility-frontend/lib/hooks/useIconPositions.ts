"use client"

import { useState, useCallback, useEffect } from "react"
import type { IconPosition, IconPositions } from "@/lib/types"

const STORAGE_KEY_PREFIX = "icon-positions-"
const ICON_SIZE = 100 // Width/height of each icon
const ICON_GAP = 16 // Gap between auto-positioned icons

function getStorageKey(folderId: string | null): string {
  return `${STORAGE_KEY_PREFIX}${folderId || "root"}`
}

function loadPositions(folderId: string | null): IconPositions {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem(getStorageKey(folderId))
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function savePositions(folderId: string | null, positions: IconPositions): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(getStorageKey(folderId), JSON.stringify(positions))
  } catch (e) {
    console.error("Failed to save icon positions:", e)
  }
}

// Calculate auto-position for items without saved positions
function calculateAutoPosition(
  index: number,
  containerWidth: number
): IconPosition {
  const iconsPerRow = Math.max(1, Math.floor(containerWidth / (ICON_SIZE + ICON_GAP)))
  const row = Math.floor(index / iconsPerRow)
  const col = index % iconsPerRow
  return {
    x: col * (ICON_SIZE + ICON_GAP) + ICON_GAP,
    y: row * (ICON_SIZE + ICON_GAP) + ICON_GAP,
  }
}

export function useIconPositions(folderId: string | null, containerWidth: number = 800) {
  const [positions, setPositions] = useState<IconPositions>(() => loadPositions(folderId))

  // Reload positions when folder changes
  useEffect(() => {
    setPositions(loadPositions(folderId))
  }, [folderId])

  const getPosition = useCallback(
    (itemId: string, index: number): IconPosition => {
      if (positions[itemId]) {
        return positions[itemId]
      }
      return calculateAutoPosition(index, containerWidth)
    },
    [positions, containerWidth]
  )

  const setPosition = useCallback(
    (itemId: string, position: IconPosition) => {
      setPositions((prev) => {
        const next = { ...prev, [itemId]: position }
        savePositions(folderId, next)
        return next
      })
    },
    [folderId]
  )

  const clearPositions = useCallback(() => {
    setPositions({})
    if (typeof window !== "undefined") {
      localStorage.removeItem(getStorageKey(folderId))
    }
  }, [folderId])

  return {
    positions,
    getPosition,
    setPosition,
    clearPositions,
  }
}
