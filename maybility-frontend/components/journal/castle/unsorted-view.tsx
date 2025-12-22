"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import type { Node } from "@/lib/types"

interface UnsortedViewProps {
  unsortedNodes: Node[]
  internalSelection: string | null
  onSelect: (nodeId: string) => void
  onDoubleClick: (node: Node) => void
}

interface BouncingNode {
  id: string
  node: Node
  x: number
  y: number
  vx: number
  vy: number
  width: number
  height: number
  hue: number
}

const NODE_WIDTH = 160
const NODE_HEIGHT = 36
const BASE_SPEED = 1.5

export function UnsortedView({ unsortedNodes, internalSelection, onSelect, onDoubleClick }: UnsortedViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const bouncingNodesRef = useRef<Map<string, BouncingNode>>(new Map())
  const [initialized, setInitialized] = useState(false)

  // Initialize bouncing nodes
  useEffect(() => {
    if (!containerRef.current || unsortedNodes.length === 0) return

    const rect = containerRef.current.getBoundingClientRect()
    const existing = bouncingNodesRef.current

    unsortedNodes.forEach((node, i) => {
      if (!existing.has(node.id)) {
        // Random starting position
        const x = Math.random() * (rect.width - NODE_WIDTH - 40) + 20
        const y = Math.random() * (rect.height - NODE_HEIGHT - 40) + 20

        // Random velocity direction
        const angle = Math.random() * Math.PI * 2
        const speed = BASE_SPEED + Math.random() * 0.5

        existing.set(node.id, {
          id: node.id,
          node,
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          hue: (i * 60 + Math.random() * 30) % 360, // Different colors
        })
      } else {
        // Update node reference
        const bn = existing.get(node.id)!
        bn.node = node
      }
    })

    // Remove nodes that no longer exist
    existing.forEach((_, id) => {
      if (!unsortedNodes.find(n => n.id === id)) {
        existing.delete(id)
      }
    })

    setInitialized(true)
  }, [unsortedNodes])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }

    const resizeObserver = new ResizeObserver(() => resizeCanvas())
    resizeObserver.observe(container)
    resizeCanvas()

    const animate = () => {
      const dpr = window.devicePixelRatio || 1
      const width = canvas.width / dpr
      const height = canvas.height / dpr

      // Dark background
      ctx.fillStyle = "#09090b"
      ctx.fillRect(0, 0, width, height)

      // Empty state
      if (bouncingNodesRef.current.size === 0) {
        ctx.fillStyle = "#52525b"
        ctx.font = "16px system-ui"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText("No unsorted ideas", width / 2, height / 2)
        ctx.font = "13px system-ui"
        ctx.fillText("All your thoughts have found a home", width / 2, height / 2 + 24)
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      // Update and draw bouncing nodes
      bouncingNodesRef.current.forEach((bn) => {
        // Update position
        bn.x += bn.vx
        bn.y += bn.vy

        // Bounce off walls
        if (bn.x <= 0) {
          bn.x = 0
          bn.vx = Math.abs(bn.vx)
          bn.hue = (bn.hue + 30) % 360 // Color change on bounce
        }
        if (bn.x + bn.width >= width) {
          bn.x = width - bn.width
          bn.vx = -Math.abs(bn.vx)
          bn.hue = (bn.hue + 30) % 360
        }
        if (bn.y <= 0) {
          bn.y = 0
          bn.vy = Math.abs(bn.vy)
          bn.hue = (bn.hue + 30) % 360
        }
        if (bn.y + bn.height >= height) {
          bn.y = height - bn.height
          bn.vy = -Math.abs(bn.vy)
          bn.hue = (bn.hue + 30) % 360
        }

        const isSelected = internalSelection === bn.id

        // Draw node
        ctx.save()

        // Glow effect
        if (isSelected) {
          ctx.shadowColor = `hsl(${bn.hue}, 70%, 50%)`
          ctx.shadowBlur = 20
        }

        // Background
        ctx.beginPath()
        ctx.roundRect(bn.x, bn.y, bn.width, bn.height, 8)
        ctx.fillStyle = isSelected
          ? `hsl(${bn.hue}, 60%, 25%)`
          : `hsl(${bn.hue}, 40%, 15%)`
        ctx.fill()

        // Border
        ctx.strokeStyle = `hsl(${bn.hue}, 70%, ${isSelected ? 60 : 40}%)`
        ctx.lineWidth = isSelected ? 2 : 1
        ctx.stroke()

        ctx.restore()

        // Icon
        ctx.fillStyle = `hsl(${bn.hue}, 60%, 70%)`
        ctx.font = "14px system-ui"
        ctx.textAlign = "left"
        ctx.textBaseline = "middle"
        ctx.fillText("📄", bn.x + 10, bn.y + bn.height / 2)

        // Name
        ctx.fillStyle = isSelected ? "#fff" : "#a1a1aa"
        ctx.font = `${isSelected ? "600" : "400"} 13px system-ui`
        const displayName = bn.node.name.length > 16
          ? bn.node.name.slice(0, 16) + "..."
          : bn.node.name
        ctx.fillText(displayName, bn.x + 32, bn.y + bn.height / 2)
      })

      // Instructions
      ctx.fillStyle = "#52525b"
      ctx.font = "12px system-ui"
      ctx.textAlign = "center"
      ctx.textBaseline = "bottom"
      ctx.fillText("Click to select, double-click to open, drag to castle to organize", width / 2, height - 12)

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      resizeObserver.disconnect()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [initialized, internalSelection])

  const findNodeAtPos = useCallback((x: number, y: number): BouncingNode | null => {
    let found: BouncingNode | null = null
    bouncingNodesRef.current.forEach((bn) => {
      if (x >= bn.x && x <= bn.x + bn.width && y >= bn.y && y <= bn.y + bn.height) {
        found = bn
      }
    })
    return found
  }, [])

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const bn = findNodeAtPos(x, y)
    if (bn) {
      onSelect(bn.id)
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const bn = findNodeAtPos(x, y)
    if (bn) {
      onDoubleClick(bn.node)
    }
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className="w-full h-full cursor-pointer"
      />
    </div>
  )
}
