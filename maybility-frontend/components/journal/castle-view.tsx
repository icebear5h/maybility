"use client"

import type React from "react"
import { useRef, useState, useMemo, useCallback, useEffect } from "react"
import type { Node, BreadcrumbPath } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  Folder,
  FileText,
  ChevronRight,
  ChevronUp,
  Home,
  Archive,
  Inbox,
  Plus,
  Trash2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CastleViewProps {
  nodes: Node[]
  onSelectNode: (node: Node | null) => void
  onCreateNode: (type: "folder" | "file", parentId: string | null) => void
  onDeleteNode: (node: Node) => void
  onMoveNode: (node: Node, newParentId: string | null) => void
}

interface CanvasNode {
  node: Node
  x: number
  y: number
  targetX: number
  targetY: number
  vx: number
  vy: number
  width: number
  height: number
  isDragging: boolean
  dragOffsetX: number
  dragOffsetY: number
  wiggle: number
  wiggleTime: number
}

export default function CastleView({
  nodes: propNodes,
  onSelectNode,
  onCreateNode,
  onDeleteNode,
  onMoveNode,
}: CastleViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const canvasNodesRef = useRef<Map<string, CanvasNode>>(new Map())
  const lastCanvasSizeRef = useRef({ width: 0, height: 0 })

  const nodes = propNodes || []
  const [subMode, setSubMode] = useState<"castle" | "unsorted" | "archive">("castle")
  const [currentFolderId, setCurrentFolderId] = useState<string | null>("all-entries")
  const [navigationHistory, setNavigationHistory] = useState<(string | null)[]>(["all-entries"])
  const [deleteConfirmNode, setDeleteConfirmNode] = useState<Node | null>(null)
  const [showSecondConfirm, setShowSecondConfirm] = useState(false)
  const [internalSelection, setInternalSelection] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [dragStartY, setDragStartY] = useState(0)

  const activeNodes = useMemo(() => nodes.filter((n) => !n.archivedAt), [nodes])
  const archivedNodes = useMemo(() => nodes.filter((n) => n.archivedAt), [nodes])
  const unsortedNodes = useMemo(
    () => activeNodes.filter((n) => n.parentIds.length === 0 && n.type === "file"),
    [activeNodes],
  )

  const currentChildren = useMemo(() => {
    if (currentFolderId === null) {
      return activeNodes.filter((n) => n.parentIds.length === 0)
    }
    return activeNodes.filter((n) => n.parentIds.includes(currentFolderId))
  }, [activeNodes, currentFolderId])

  const getChildCount = useCallback(
    (nodeId: string) => {
      return activeNodes.filter((n) => n.parentIds.includes(nodeId)).length
    },
    [activeNodes],
  )

  const depth = navigationHistory.length - 1

  const parentFolderId = navigationHistory.length > 1 ? navigationHistory[navigationHistory.length - 2] : null

  const buildPathsToNode = useCallback(
    (nodeId: string | null): BreadcrumbPath[] => {
      if (nodeId === null) return [{ nodes: [], isActive: true }]
      const node = nodes.find((n) => n.id === nodeId)
      if (!node) return [{ nodes: [], isActive: true }]
      if (node.parentIds.length === 0) {
        return [{ nodes: [node], isActive: true }]
      }
      const paths: BreadcrumbPath[] = []
      for (const parentId of node.parentIds) {
        const parentPaths = buildPathsToNode(parentId)
        for (const parentPath of parentPaths) {
          paths.push({ nodes: [...parentPath.nodes, node], isActive: parentPath.isActive })
        }
      }
      return paths
    },
    [nodes],
  )

  const breadcrumbPaths = useMemo(() => buildPathsToNode(currentFolderId), [buildPathsToNode, currentFolderId])

  const navigateInto = (folderId: string) => {
    setNavigationHistory((prev) => [...prev, folderId])
    setCurrentFolderId(folderId)
    setInternalSelection(null)
  }

  const navigateUp = () => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory]
      newHistory.pop()
      setNavigationHistory(newHistory)
      setCurrentFolderId(newHistory[newHistory.length - 1])
      setInternalSelection(null)
    }
  }

  const navigateTo = (nodeId: string | null) => {
    const targetIndex = navigationHistory.indexOf(nodeId)
    if (targetIndex !== -1) {
      setNavigationHistory(navigationHistory.slice(0, targetIndex + 1))
    } else {
      setNavigationHistory(
        ["all-entries", nodeId].filter((id) => id !== null || navigationHistory[0] === null) as (string | null)[],
      )
    }
    setCurrentFolderId(nodeId)
    setInternalSelection(null)
  }

  const handleDeleteRequest = (node: Node) => {
    const childCount = node.type === "folder" ? getChildCount(node.id) : 0
    if (childCount > 0) {
      setDeleteConfirmNode(node)
      setShowSecondConfirm(false)
    } else {
      setDeleteConfirmNode(node)
    }
  }

  const handleFirstConfirm = () => {
    const childCount = deleteConfirmNode?.type === "folder" ? getChildCount(deleteConfirmNode.id) : 0
    if (childCount > 0) {
      setShowSecondConfirm(true)
    } else {
      onDeleteNode(deleteConfirmNode!)
      setDeleteConfirmNode(null)
    }
  }

  const handleSecondConfirm = () => {
    onDeleteNode(deleteConfirmNode!)
    setDeleteConfirmNode(null)
    setShowSecondConfirm(false)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || subMode !== "castle") return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect()
      if (rect.width < 100 || rect.height < 100) return

      const dpr = window.devicePixelRatio || 1
      const newWidth = rect.width
      const newHeight = rect.height

      if (canvas.width !== newWidth * dpr || canvas.height !== newHeight * dpr) {
        canvas.width = newWidth * dpr
        canvas.height = newHeight * dpr
        canvas.style.width = `${newWidth}px`
        canvas.style.height = `${newHeight}px`
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.scale(dpr, dpr)

        lastCanvasSizeRef.current = { width: newWidth, height: newHeight }
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
    })
    resizeObserver.observe(container)

    requestAnimationFrame(() => {
      resizeCanvas()
    })

    const initializeNodes = () => {
      const width = lastCanvasSizeRef.current.width || container.getBoundingClientRect().width || 800
      const height = lastCanvasSizeRef.current.height || container.getBoundingClientRect().height || 600

      const folders = currentChildren.filter((n) => n.type === "folder")
      const files = currentChildren.filter((n) => n.type === "file")
      const centerX = width / 2
      const centerY = height / 2

      const folderSpacing = 180
      const fileSpacing = 150
      const folderY = centerY - 80
      const fileY = centerY + 100

      folders.forEach((node, i) => {
        const x = centerX + (i - (folders.length - 1) / 2) * folderSpacing
        const cn = canvasNodesRef.current.get(node.id)
        if (cn) {
          cn.targetX = x
          cn.targetY = folderY
        }
      })

      files.forEach((node, i) => {
        const x = centerX + (i - (files.length - 1) / 2) * fileSpacing
        const cn = canvasNodesRef.current.get(node.id)
        if (cn) {
          cn.targetX = x
          cn.targetY = fileY
        }
      })

      const currentIds = new Set(currentChildren.map((n) => n.id))
      canvasNodesRef.current.forEach((_, id) => {
        if (!currentIds.has(id)) {
          canvasNodesRef.current.delete(id)
        }
      })
    }

    initializeNodes()

    let time = 0
    const animate = () => {
      time += 0.016
      const dpr = window.devicePixelRatio || 1
      const width = canvas.width / dpr
      const height = canvas.height / dpr

      if (width < 100 || height < 100) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      const centerX = width / 2
      const centerY = height / 2

      ctx.fillStyle = "#09090b"
      ctx.fillRect(0, 0, width, height)

      ctx.save()
      ctx.translate(pan.x + width / 2, pan.y + height / 2)
      ctx.scale(zoom, zoom)
      ctx.translate(-width / 2, -height / 2)

      ctx.strokeStyle = "#1a1a1f"
      ctx.lineWidth = 1
      const gridSize = 50
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      const depthLineY = centerY
      ctx.strokeStyle = "#27272a"
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(50, depthLineY)
      ctx.lineTo(width - 50, depthLineY)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = "#3f3f46"
      ctx.font = "12px system-ui"
      ctx.textAlign = "left"
      ctx.fillText("↑ Abstract (Parent)", 50, depthLineY - 120)
      ctx.fillText("↓ Concrete (Children)", 50, depthLineY + 150)

      canvasNodesRef.current.forEach((cn) => {
        if (cn.node.type === "file") {
          const parentFolder = currentChildren
            .filter((n) => n.type === "folder")
            .find((f) => cn.node.parentIds.includes(f.id))
          if (parentFolder) {
            const parentCn = canvasNodesRef.current.get(parentFolder.id)
            if (parentCn) {
              ctx.strokeStyle = internalSelection === cn.node.id ? "#6366f1" : "#27272a"
              ctx.lineWidth = internalSelection === cn.node.id ? 2 : 1
              ctx.beginPath()
              ctx.moveTo(parentCn.x, parentCn.y + parentCn.height / 2)
              const midY = (parentCn.y + parentCn.height / 2 + cn.y - cn.height / 2) / 2
              ctx.quadraticCurveTo(parentCn.x, midY, cn.x, cn.y - cn.height / 2)
              ctx.stroke()
            }
          } else if (currentFolderId) {
            ctx.strokeStyle = "#27272a"
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(centerX, 80) // Declare folderY variable
            ctx.lineTo(cn.x, cn.y - cn.height / 2)
            ctx.stroke()
          }
        }
      })

      canvasNodesRef.current.forEach((cn) => {
        if (!cn.isDragging) {
          const dx = cn.targetX - cn.x
          const dy = cn.targetY - cn.y
          cn.vx += dx * 0.08
          cn.vy += dy * 0.08
          cn.vx *= 0.85
          cn.vy *= 0.85
          cn.x += cn.vx
          cn.y += cn.vy

          cn.y += Math.sin(time * 2 + cn.targetX * 0.01) * 0.3
        }

        if (cn.wiggle > 0) {
          cn.wiggleTime += 0.3
          cn.wiggle -= 0.02
          ctx.save()
          ctx.translate(cn.x, cn.y)
          ctx.rotate(Math.sin(cn.wiggleTime) * 0.1 * cn.wiggle)
          ctx.translate(-cn.x, -cn.y)
        }

        const isSelected = internalSelection === cn.node.id
        const isFolder = cn.node.type === "folder"
        const childCount = isFolder ? getChildCount(cn.node.id) : 0

        const radius = 8
        ctx.beginPath()
        ctx.roundRect(cn.x - cn.width / 2, cn.y - cn.height / 2, cn.width, cn.height, radius)

        if (isSelected) {
          ctx.fillStyle = isFolder ? "#4f46e5" : "#3f3f46"
          ctx.strokeStyle = "#818cf8"
          ctx.lineWidth = 2
        } else {
          ctx.fillStyle = isFolder ? "#1e1b4b" : "#18181b"
          ctx.strokeStyle = isFolder ? "#4f46e5" : "#27272a"
          ctx.lineWidth = 1
        }
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = isFolder ? "#a5b4fc" : "#71717a"
        ctx.font = "16px system-ui"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(isFolder ? "📁" : "📄", cn.x - cn.width / 2 + 20, cn.y)

        ctx.fillStyle = isSelected ? "#fff" : "#a1a1aa"
        ctx.font = `${isSelected ? "600" : "400"} 13px system-ui`
        ctx.textAlign = "left"
        const displayName = cn.node.name.length > 14 ? cn.node.name.slice(0, 14) + "…" : cn.node.name
        ctx.fillText(displayName, cn.x - cn.width / 2 + 38, cn.y)

        if (isFolder && childCount > 0) {
          ctx.beginPath()
          ctx.arc(cn.x + cn.width / 2 - 15, cn.y - cn.height / 2 + 10, 10, 0, Math.PI * 2)
          ctx.fillStyle = "#22c55e"
          ctx.fill()
          ctx.fillStyle = "#fff"
          ctx.font = "bold 10px system-ui"
          ctx.textAlign = "center"
          ctx.fillText(String(childCount), cn.x + cn.width / 2 - 15, cn.y - cn.height / 2 + 11)
        }

        if (cn.node.parentIds.length > 1) {
          ctx.beginPath()
          ctx.arc(cn.x - cn.width / 2 + 10, cn.y - cn.height / 2 + 10, 8, 0, Math.PI * 2)
          ctx.fillStyle = "#f59e0b"
          ctx.fill()
          ctx.fillStyle = "#fff"
          ctx.font = "bold 9px system-ui"
          ctx.textAlign = "center"
          ctx.fillText(String(cn.node.parentIds.length), cn.x - cn.width / 2 + 10, cn.y - cn.height / 2 + 11)
        }

        if (cn.isDragging) {
          ctx.fillStyle = "#22c55e"
          ctx.font = "12px system-ui"
          ctx.textAlign = "center"
          ctx.fillText("↑ Drag up to move to parent", cn.x, cn.y - cn.height / 2 - 15)
        }

        if (cn.wiggle > 0) {
          ctx.restore()
        }
      })

      if (currentFolderId) {
        const currentFolder = nodes.find((n) => n.id === currentFolderId)
        if (currentFolder) {
          ctx.fillStyle = "#6366f1"
          ctx.font = "bold 14px system-ui"
          ctx.textAlign = "center"
          ctx.fillText(`📁 ${currentFolder.name}`, width / 2, 40)
        }
      } else {
        ctx.fillStyle = "#6366f1"
        ctx.font = "bold 14px system-ui"
        ctx.textAlign = "center"
        ctx.fillText("🏠 Root", width / 2, 40)
      }

      ctx.fillStyle = "#3f3f46"
      ctx.font = "11px system-ui"
      ctx.textAlign = "right"
      ctx.fillText(`Depth: ${depth}`, width - 20, 30)

      ctx.restore()

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      resizeObserver.disconnect()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [currentChildren, currentFolderId, depth, zoom, pan, subMode, internalSelection, nodes, getChildCount])

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const x = (e.clientX - rect.left - pan.x - width / 2) / zoom + width / 2
    const y = (e.clientY - rect.top - pan.y - height / 2) / zoom + height / 2
    return { x, y }
  }

  const findNodeAtPos = (x: number, y: number): CanvasNode | null => {
    let found: CanvasNode | null = null
    canvasNodesRef.current.forEach((cn) => {
      if (
        x >= cn.x - cn.width / 2 &&
        x <= cn.x + cn.width / 2 &&
        y >= cn.y - cn.height / 2 &&
        y <= cn.y + cn.height / 2
      ) {
        found = cn
      }
    })
    return found
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e)
    const cn = findNodeAtPos(pos.x, pos.y)

    if (cn) {
      setInternalSelection(cn.node.id)
      setDraggingNodeId(cn.node.id)
      setDragStartY(pos.y)
      cn.isDragging = true
      cn.dragOffsetX = pos.x - cn.x
      cn.dragOffsetY = pos.y - cn.y
    } else {
      setInternalSelection(null)
      setIsPanning(true)
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.x
      const dy = e.clientY - lastMousePos.y
      const PAN_BOUND = 200 // Maximum pixels the view can pan from center
      setPan((prev) => ({
        x: Math.max(-PAN_BOUND, Math.min(PAN_BOUND, prev.x + dx)),
        y: Math.max(-PAN_BOUND, Math.min(PAN_BOUND, prev.y + dy)),
      }))
      setLastMousePos({ x: e.clientX, y: e.clientY })
    } else if (draggingNodeId) {
      const cn = canvasNodesRef.current.get(draggingNodeId)
      if (cn) {
        const pos = getMousePos(e)
        cn.x = pos.x - cn.dragOffsetX
        cn.y = pos.y - cn.dragOffsetY
      }
    }
  }

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const cn = canvasNodesRef.current.get(draggingNodeId)
      if (cn) {
        const pos = getMousePos(e)
        const dragDeltaY = dragStartY - pos.y

        if (dragDeltaY > 50 && parentFolderId !== undefined) {
          cn.wiggle = 1
          cn.wiggleTime = 0
          setTimeout(() => {
            onMoveNode(cn.node, parentFolderId)
          }, 500)
        }

        cn.isDragging = false
      }
      setDraggingNodeId(null)
    }
    setIsPanning(false)
  }

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    const pos = getMousePos(e)
    const cn = findNodeAtPos(pos.x, pos.y)

    if (cn) {
      if (cn.node.type === "folder") {
        navigateInto(cn.node.id)
      } else {
        onSelectNode(cn.node)
      }
    }
  }

  const MIN_ZOOM = 0.5
  const MAX_ZOOM = 1

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom((prev) => Math.min(Math.max(prev + delta, MIN_ZOOM), MAX_ZOOM))
    } else if (e.shiftKey) {
      if (e.deltaY < 0) {
        navigateUp()
      }
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm z-10">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSubMode("castle")}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                subMode === "castle"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              Castle
            </button>
            <button
              onClick={() => setSubMode("unsorted")}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5",
                subMode === "unsorted"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <Inbox className="h-3.5 w-3.5" />
              Unsorted
              {unsortedNodes.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                  {unsortedNodes.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setSubMode("archive")}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5",
                subMode === "archive"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <Archive className="h-3.5 w-3.5" />
              Archive
            </button>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onCreateNode("folder", currentFolderId)}>
                  <Folder className="h-4 w-4 mr-2" />
                  New Folder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateNode("file", currentFolderId)}>
                  <FileText className="h-4 w-4 mr-2" />
                  New File
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
          <button
            onClick={() => navigateTo(null)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </button>

          {breadcrumbPaths[0]?.nodes.map((node, index) => (
            <div key={node.id} className="flex items-center gap-2 shrink-0">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              {node.parentIds.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 text-sm text-foreground hover:text-primary transition-colors">
                      <Folder className="h-4 w-4 text-primary" />
                      <span>{node.name}</span>
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                        {node.parentIds.length} paths
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {breadcrumbPaths.map((path, pathIndex) => (
                      <DropdownMenuItem
                        key={pathIndex}
                        onClick={() => navigateTo(path.nodes[path.nodes.length - 1]?.id || null)}
                      >
                        {path.nodes.map((n) => n.name).join(" / ") || "Home"}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button
                  onClick={() => navigateTo(node.id)}
                  className="flex items-center gap-1 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Folder className="h-4 w-4 text-primary" />
                  <span>{node.name}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {subMode === "castle" ? (
        <div ref={containerRef} className="flex-1 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onDoubleClick={handleCanvasDoubleClick}
            onWheel={handleWheel}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          />

          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.min(z + 0.2, MAX_ZOOM))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.max(z - 0.2, MIN_ZOOM))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>

          <div className="absolute bottom-4 left-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={navigateUp}
              disabled={navigationHistory.length <= 1}
              className="gap-1 bg-transparent"
            >
              <ChevronUp className="h-4 w-4" />
              Up (Abstract)
            </Button>
          </div>

          <div className="absolute top-4 right-4 text-xs text-muted-foreground bg-background/80 px-3 py-2 rounded-md">
            <div>Double-click folder to zoom in</div>
            <div>Drag node up to move to parent</div>
            <div>Ctrl+scroll to zoom, Shift+scroll to navigate</div>
          </div>
        </div>
      ) : subMode === "unsorted" ? (
        <div className="flex-1 p-4 overflow-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {unsortedNodes.map((node) => (
              <div
                key={node.id}
                className={cn(
                  "p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors",
                  internalSelection === node.id && "ring-2 ring-primary",
                )}
                onClick={() => setInternalSelection(node.id)}
                onDoubleClick={() => onSelectNode(node)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium truncate">{node.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">No parent folder</div>
              </div>
            ))}
            {unsortedNodes.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No unsorted files. All files have been organized!
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 p-4 overflow-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {archivedNodes.map((node) => (
              <div
                key={node.id}
                className="p-4 rounded-lg border bg-card/50 opacity-60 hover:opacity-100 transition-opacity"
              >
                <div className="flex items-center gap-2 mb-2">
                  {node.type === "folder" ? (
                    <Folder className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="font-medium truncate">{node.name}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCreateNode(node.type, node.parentIds[0] || null)}
                  >
                    Restore
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteRequest(node)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {archivedNodes.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">Archive is empty</div>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteConfirmNode && !showSecondConfirm} onOpenChange={() => setDeleteConfirmNode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete {deleteConfirmNode?.type === "folder" ? "Folder" : "File"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmNode?.name}"?
              {deleteConfirmNode?.type === "folder" && getChildCount(deleteConfirmNode.id) > 0 && (
                <span className="block mt-2 text-destructive">
                  This folder contains {getChildCount(deleteConfirmNode.id)} item(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFirstConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSecondConfirm} onOpenChange={() => setShowSecondConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Final Confirmation
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteConfirmNode?.name}" and all{" "}
              {getChildCount(deleteConfirmNode?.id || "")} items inside. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSecondConfirm} className="bg-destructive text-destructive-foreground">
              Yes, Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
