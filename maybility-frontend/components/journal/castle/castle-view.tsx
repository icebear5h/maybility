"use client"

import { useRef, useState, useMemo, useCallback, useEffect } from "react"
import type { Node } from "@/lib/types"
import { ChevronUp, AlertTriangle, ZoomIn, ZoomOut } from "lucide-react"
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

import { CastleHeader } from "./castle-header"
import { JournalTimeline } from "./journal-timeline"
import { format, startOfWeek, startOfMonth } from "date-fns"
import type { CastleSubMode } from "@/lib/types"

interface CastleViewProps {
  nodes: Node[]
  onSelectNode: (node: Node | null) => void
  onCreateNode: (type: "folder" | "file", parentId: string | null) => void
  onDeleteNode: (node: Node) => void
  onMoveNode: (node: Node, newParentId: string | null) => void
  onUpdateNode?: (nodeId: string, updates: { name?: string; description?: string | null }) => void
}

interface CanvasNode {
  node: Node
  x: number
  y: number
  width: number
  height: number
  isDragging: boolean
  dragOffsetX: number
  dragOffsetY: number
}

interface NodePositions {
  [nodeId: string]: { x: number; y: number }
}

interface Connection {
  from: string
  to: string
  label?: string
}

const DROP_ZONE_HEIGHT = 60
const NODE_WIDTH = 180
const NODE_HEIGHT = 40
const STORAGE_KEY_PREFIX = "castle-positions-"
const CONNECTIONS_KEY_PREFIX = "castle-connections-"

// Virtual folder IDs for special views
const UNSORTED_FOLDER_ID = "__unsorted__"
const ARCHIVE_FOLDER_ID = "__archive__"

function getStorageKey(folderId: string | null, subMode: CastleSubMode): string {
  // Each view mode gets its own position storage at root level
  if (folderId === null) {
    return `${STORAGE_KEY_PREFIX}${subMode}`
  }
  return `${STORAGE_KEY_PREFIX}${folderId}`
}

function loadPositions(folderId: string | null, subMode: CastleSubMode = "ideas"): NodePositions {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem(getStorageKey(folderId, subMode))
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function savePositions(folderId: string | null, positions: NodePositions, subMode: CastleSubMode = "ideas"): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(getStorageKey(folderId, subMode), JSON.stringify(positions))
  } catch (e) {
    console.error("Failed to save positions:", e)
  }
}

function loadConnections(folderId: string | null): Connection[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(`${CONNECTIONS_KEY_PREFIX}${folderId || "root"}`)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveConnections(folderId: string | null, connections: Connection[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`${CONNECTIONS_KEY_PREFIX}${folderId || "root"}`, JSON.stringify(connections))
  } catch (e) {
    console.error("Failed to save connections:", e)
  }
}

export default function CastleView({ nodes: propNodes, onSelectNode, onCreateNode, onDeleteNode, onMoveNode, onUpdateNode }: CastleViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const canvasNodesRef = useRef<Map<string, CanvasNode>>(new Map())
  const lastCanvasSizeRef = useRef({ width: 0, height: 0 })

  // Memoize nodes to prevent unnecessary re-renders
  const nodes = useMemo(() => propNodes || [], [propNodes])
  const [subMode, setSubMode] = useState<CastleSubMode>("ideas")
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [navigationHistory, setNavigationHistory] = useState<(string | null)[]>([null])

  // Handler to switch sub-modes - navigates to virtual folders for unsorted/archive
  const handleSubModeChange = useCallback((newMode: CastleSubMode) => {
    setSubMode(newMode)
    setInternalSelection(null)

    if (newMode === "unsorted") {
      // Navigate into virtual unsorted folder
      setCurrentFolderId(UNSORTED_FOLDER_ID)
      setNavigationHistory([null, UNSORTED_FOLDER_ID])
    } else if (newMode === "archive") {
      // Navigate into virtual archive folder
      setCurrentFolderId(ARCHIVE_FOLDER_ID)
      setNavigationHistory([null, ARCHIVE_FOLDER_ID])
    } else if (newMode === "ideas") {
      // Return to root
      setCurrentFolderId(null)
      setNavigationHistory([null])
    }
  }, [])
  const [deleteConfirmNode, setDeleteConfirmNode] = useState<Node | null>(null)
  const [showSecondConfirm, setShowSecondConfirm] = useState(false)
  const [internalSelection, setInternalSelection] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const lastMousePosRef = useRef({ x: 0, y: 0 })
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [isOverDropZone, setIsOverDropZone] = useState(false)
  const [savedPositions, setSavedPositions] = useState<NodePositions>(() => loadPositions(null))

  // Arrow drawing state - use refs for animation loop to avoid restarts
  const [connections, setConnections] = useState<Connection[]>(() => loadConnections(null))
  const [isDrawingArrow, setIsDrawingArrow] = useState(false)
  const [arrowStartNodeId, setArrowStartNodeId] = useState<string | null>(null)
  const [arrowEndPos, setArrowEndPos] = useState<{ x: number; y: number } | null>(null)
  const [selectedConnectionIndex, setSelectedConnectionIndex] = useState<number | null>(null)
  const [editingConnectionIndex, setEditingConnectionIndex] = useState<number | null>(null)
  const [editingLabelPos, setEditingLabelPos] = useState<{ x: number; y: number } | null>(null)
  const [editingLabelValue, setEditingLabelValue] = useState("")
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null)
  const [editingNodeField, setEditingNodeField] = useState<{ nodeId: string; field: 'name' | 'description' } | null>(null)
  const [editingNodeValue, setEditingNodeValue] = useState("")

  // Refs for animation loop to read without causing restarts
  const connectionsRef = useRef<Connection[]>(connections)
  const isDrawingArrowRef = useRef(isDrawingArrow)
  const arrowStartNodeIdRef = useRef(arrowStartNodeId)
  const arrowEndPosRef = useRef(arrowEndPos)
  const selectedConnectionIndexRef = useRef(selectedConnectionIndex)
  const internalSelectionRef = useRef(internalSelection)
  const isOverDropZoneRef = useRef(isOverDropZone)
  const draggingNodeIdRef = useRef(draggingNodeId)
  const panRef = useRef(pan)
  const zoomRef = useRef(zoom)
  const expandedNodeIdRef = useRef(expandedNodeId)

  // Keep refs in sync with state
  useEffect(() => { connectionsRef.current = connections }, [connections])
  useEffect(() => { isDrawingArrowRef.current = isDrawingArrow }, [isDrawingArrow])
  useEffect(() => { arrowStartNodeIdRef.current = arrowStartNodeId }, [arrowStartNodeId])
  useEffect(() => { arrowEndPosRef.current = arrowEndPos }, [arrowEndPos])
  useEffect(() => { selectedConnectionIndexRef.current = selectedConnectionIndex }, [selectedConnectionIndex])
  useEffect(() => { internalSelectionRef.current = internalSelection }, [internalSelection])
  useEffect(() => { isOverDropZoneRef.current = isOverDropZone }, [isOverDropZone])
  useEffect(() => { draggingNodeIdRef.current = draggingNodeId }, [draggingNodeId])
  useEffect(() => { panRef.current = pan }, [pan])
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { expandedNodeIdRef.current = expandedNodeId }, [expandedNodeId])

  // Reload positions and connections when folder or view mode changes
  useEffect(() => {
    setSavedPositions(loadPositions(currentFolderId, subMode))
    const loadedConnections = loadConnections(currentFolderId)
    setConnections(loadedConnections)
    connectionsRef.current = loadedConnections
    setSelectedConnectionIndex(null)
  }, [currentFolderId, subMode])

  // Handle keyboard for deleting connections
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedConnectionIndexRef.current !== null) {
        e.preventDefault()
        const idx = selectedConnectionIndexRef.current
        const next = connectionsRef.current.filter((_, i) => i !== idx)
        connectionsRef.current = next
        saveConnections(currentFolderId, next)
        setConnections(next)
        setSelectedConnectionIndex(null)
      }
      // Escape to cancel arrow drawing
      if (e.key === "Escape") {
        setIsDrawingArrow(false)
        setArrowStartNodeId(null)
        setArrowEndPos(null)
        setSelectedConnectionIndex(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentFolderId])

  const activeNodes = useMemo(() => nodes.filter((n) => !n.archivedAt), [nodes])
  const archivedNodes = useMemo(() => nodes.filter((n) => n.archivedAt), [nodes])
  const unsortedNodes = useMemo(
    () => activeNodes.filter((n) => n.parentIds.length === 0 && n.type === "file"),
    [activeNodes],
  )

  // Nodes to display based on current folder and filter mode
  const currentChildren = useMemo(() => {
    // Journal mode doesn't show idea nodes
    if (subMode === "journal") return []

    let baseNodes: Node[] = []

    if (currentFolderId === null) {
      // At root level - show all root nodes (folders + files)
      baseNodes = activeNodes.filter((n) => n.parentIds.length === 0)
    } else if (currentFolderId === UNSORTED_FOLDER_ID) {
      // Virtual unsorted folder - show orphan files
      baseNodes = unsortedNodes
    } else if (currentFolderId === ARCHIVE_FOLDER_ID) {
      // Virtual archive folder - show archived nodes
      baseNodes = archivedNodes
    } else {
      // Inside a regular folder - show children
      baseNodes = activeNodes.filter((n) => n.parentIds.includes(currentFolderId))
    }

    return baseNodes
  }, [activeNodes, archivedNodes, unsortedNodes, currentFolderId, subMode])

  const getChildCount = useCallback(
    (nodeId: string) => {
      return activeNodes.filter((n) => n.parentIds.includes(nodeId)).length
    },
    [activeNodes],
  )
  const getChildCountRef = useRef(getChildCount)
  useEffect(() => { getChildCountRef.current = getChildCount }, [getChildCount])

  const nodesRef = useRef(nodes)
  useEffect(() => { nodesRef.current = nodes }, [nodes])

  const depth = navigationHistory.length - 1
  const parentFolderId = navigationHistory.length > 1 ? navigationHistory[navigationHistory.length - 2] : null
  const canMoveToParent = currentFolderId !== null

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
      const newFolderId = newHistory[newHistory.length - 1]
      setCurrentFolderId(newFolderId)
      setInternalSelection(null)

      // Sync subMode when navigating back to root from virtual folders
      if (newFolderId === null) {
        setSubMode("ideas")
      }
    }
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

  const saveNodePosition = useCallback((nodeId: string, x: number, y: number) => {
    setSavedPositions((prev) => {
      const next = { ...prev, [nodeId]: { x, y } }
      savePositions(currentFolderId, next, subMode)
      return next
    })
  }, [currentFolderId, subMode])

  // Canvas rendering - always runs for unified view
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

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

    const resizeObserver = new ResizeObserver(() => resizeCanvas())
    resizeObserver.observe(container)
    requestAnimationFrame(() => resizeCanvas())

    const initializeNodes = () => {
      const contentStartY = DROP_ZONE_HEIGHT + 20
      const folders = currentChildren.filter((n) => n.type === "folder")
      const files = currentChildren.filter((n) => n.type === "file")

      // Default grid layout for nodes without saved positions
      const spacing = 200
      const startX = 100

      folders.forEach((node, i) => {
        const saved = savedPositions[node.id]
        const defaultX = startX + (i % 4) * spacing
        const defaultY = contentStartY + Math.floor(i / 4) * 80 + 50

        const cn = canvasNodesRef.current.get(node.id)
        if (cn) {
          if (!cn.isDragging) {
            cn.x = saved?.x ?? defaultX
            cn.y = saved?.y ?? defaultY
          }
          cn.node = node
        } else {
          canvasNodesRef.current.set(node.id, {
            node,
            x: saved?.x ?? defaultX,
            y: saved?.y ?? defaultY,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            isDragging: false,
            dragOffsetX: 0,
            dragOffsetY: 0,
          })
        }
      })

      files.forEach((node, i) => {
        const saved = savedPositions[node.id]
        const defaultX = startX + (i % 5) * (spacing - 40)
        const defaultY = contentStartY + Math.floor(folders.length / 4 + 1) * 80 + Math.floor(i / 5) * 70 + 50

        const cn = canvasNodesRef.current.get(node.id)
        if (cn) {
          if (!cn.isDragging) {
            cn.x = saved?.x ?? defaultX
            cn.y = saved?.y ?? defaultY
          }
          cn.node = node
        } else {
          canvasNodesRef.current.set(node.id, {
            node,
            x: saved?.x ?? defaultX,
            y: saved?.y ?? defaultY,
            width: NODE_WIDTH - 20,
            height: NODE_HEIGHT,
            isDragging: false,
            dragOffsetX: 0,
            dragOffsetY: 0,
          })
        }
      })

      // Clean up removed nodes
      const currentIds = new Set(currentChildren.map((n) => n.id))
      canvasNodesRef.current.forEach((_, id) => {
        if (!currentIds.has(id)) {
          canvasNodesRef.current.delete(id)
        }
      })
    }

    initializeNodes()

    const animate = () => {
      const dpr = window.devicePixelRatio || 1
      const width = canvas.width / dpr
      const height = canvas.height / dpr

      if (width < 100 || height < 100) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      // Background
      ctx.fillStyle = "#09090b"
      ctx.fillRect(0, 0, width, height)

      ctx.save()
      ctx.translate(panRef.current.x + width / 2, panRef.current.y + height / 2)
      ctx.scale(zoomRef.current, zoomRef.current)
      ctx.translate(-width / 2, -height / 2)

      // Dot grid (Excalidraw style)
      const gridSize = 25
      ctx.fillStyle = "#27272a"
      for (let x = gridSize; x < width * 2; x += gridSize) {
        for (let y = DROP_ZONE_HEIGHT + gridSize; y < height * 2; y += gridSize) {
          ctx.beginPath()
          ctx.arc(x, y, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Drop zone for moving to parent
      if (canMoveToParent) {
        const dropZoneActive = isOverDropZoneRef.current && draggingNodeIdRef.current !== null
        ctx.fillStyle = dropZoneActive ? "#22c55e" : "#1e1b4b"
        ctx.fillRect(0, 0, width, DROP_ZONE_HEIGHT)

        ctx.strokeStyle = dropZoneActive ? "#4ade80" : "#4f46e5"
        ctx.lineWidth = 2
        ctx.setLineDash([8, 4])
        ctx.beginPath()
        ctx.moveTo(20, DROP_ZONE_HEIGHT)
        ctx.lineTo(width - 20, DROP_ZONE_HEIGHT)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.fillStyle = dropZoneActive ? "#fff" : "#a5b4fc"
        ctx.font = "bold 14px system-ui"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        // Get current folder name (handle virtual folders)
        let currentFolderName = ""
        if (currentFolderId === UNSORTED_FOLDER_ID) {
          currentFolderName = "Unsorted"
        } else if (currentFolderId === ARCHIVE_FOLDER_ID) {
          currentFolderName = "Archive"
        } else {
          const currentFolder = nodesRef.current.find((n) => n.id === currentFolderId)
          currentFolderName = currentFolder?.name || ""
        }

        const parentName = parentFolderId
          ? nodesRef.current.find((n) => n.id === parentFolderId)?.name || "Parent"
          : "Root"

        ctx.fillText(
          dropZoneActive ? `Drop to move to ${parentName}` : `Click or drop to go to ${parentName}`,
          width / 2,
          DROP_ZONE_HEIGHT / 2
        )

        // Back arrow indicator
        ctx.fillStyle = dropZoneActive ? "#fff" : "#a5b4fc"
        ctx.font = "18px system-ui"
        ctx.textAlign = "left"
        ctx.fillText("←", 25, DROP_ZONE_HEIGHT / 2)

        // Current folder indicator on right side
        if (currentFolderName) {
          ctx.fillStyle = "#6366f1"
          ctx.font = "12px system-ui"
          ctx.textAlign = "right"
          ctx.fillText(currentFolderName, width - 25, DROP_ZONE_HEIGHT / 2)
        }
      } else {
        // Root level header
        ctx.fillStyle = "#18181b"
        ctx.fillRect(0, 0, width, DROP_ZONE_HEIGHT)
        ctx.fillStyle = "#6366f1"
        ctx.font = "bold 14px system-ui"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText("Root", width / 2, DROP_ZONE_HEIGHT / 2)
      }

      // Draw arrow connections between parent folders and child files
      const drawArrow = (
        fromX: number,
        fromY: number,
        toX: number,
        toY: number,
        color: string,
        isSelected: boolean,
        label?: string
      ): { labelX: number; labelY: number } => {
        const headLength = 10
        const headAngle = Math.PI / 6

        // Calculate control points for bezier curve
        const dx = toX - fromX
        const dy = toY - fromY
        const midX = fromX + dx / 2
        const midY = fromY + dy / 2

        // Curve outward based on distance
        const dist = Math.sqrt(dx * dx + dy * dy)
        const curveOffset = Math.min(50, dist * 0.2)
        const perpX = -dy / dist * curveOffset
        const perpY = dx / dist * curveOffset

        const cp1x = midX + perpX
        const cp1y = midY + perpY

        // Draw the curved line
        ctx.strokeStyle = color
        ctx.lineWidth = isSelected ? 3 : 2
        ctx.lineCap = "round"
        ctx.beginPath()
        ctx.moveTo(fromX, fromY)
        ctx.quadraticCurveTo(cp1x, cp1y, toX, toY)
        ctx.stroke()

        // Calculate arrow head angle at the end of the curve
        const t = 0.95
        const endTangentX = 2 * (1 - t) * (cp1x - fromX) + 2 * t * (toX - cp1x)
        const endTangentY = 2 * (1 - t) * (cp1y - fromY) + 2 * t * (toY - cp1y)
        const angle = Math.atan2(endTangentY, endTangentX)

        // Draw arrowhead
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(toX, toY)
        ctx.lineTo(
          toX - headLength * Math.cos(angle - headAngle),
          toY - headLength * Math.sin(angle - headAngle)
        )
        ctx.lineTo(
          toX - headLength * Math.cos(angle + headAngle),
          toY - headLength * Math.sin(angle + headAngle)
        )
        ctx.closePath()
        ctx.fill()

        // Calculate label position (on the curve at t=0.5)
        const labelT = 0.5
        const labelX = (1 - labelT) * (1 - labelT) * fromX + 2 * (1 - labelT) * labelT * cp1x + labelT * labelT * toX
        const labelY = (1 - labelT) * (1 - labelT) * fromY + 2 * (1 - labelT) * labelT * cp1y + labelT * labelT * toY

        // Draw label if exists
        if (label) {
          ctx.font = "12px system-ui"
          const metrics = ctx.measureText(label)
          const padding = 4
          const bgWidth = metrics.width + padding * 2
          const bgHeight = 16

          // Background pill
          ctx.fillStyle = isSelected ? "#1e1b4b" : "#18181b"
          ctx.beginPath()
          ctx.roundRect(labelX - bgWidth / 2, labelY - bgHeight / 2, bgWidth, bgHeight, 4)
          ctx.fill()

          // Border
          ctx.strokeStyle = color
          ctx.lineWidth = 1
          ctx.stroke()

          // Text
          ctx.fillStyle = isSelected ? "#a5b4fc" : "#a1a1aa"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(label, labelX, labelY)
        }

        return { labelX, labelY }
      }

      // Draw custom connections
      connectionsRef.current.forEach((conn, index) => {
        const fromCn = canvasNodesRef.current.get(conn.from)
        const toCn = canvasNodesRef.current.get(conn.to)

        if (fromCn && toCn) {
          const fromEdge = getEdgePoint(toCn.x, toCn.y, fromCn)
          const toEdge = getEdgePoint(fromCn.x, fromCn.y, toCn)

          const isHighlighted =
            internalSelectionRef.current === conn.from ||
            internalSelectionRef.current === conn.to ||
            selectedConnectionIndexRef.current === index

          drawArrow(
            fromEdge.x,
            fromEdge.y,
            toEdge.x,
            toEdge.y,
            selectedConnectionIndexRef.current === index ? "#f59e0b" : isHighlighted ? "#a78bfa" : "#6366f1",
            isHighlighted || selectedConnectionIndexRef.current === index,
            conn.label
          )
        }
      })

      // Draw arrow preview while drawing
      if (isDrawingArrowRef.current && arrowStartNodeIdRef.current && arrowEndPosRef.current) {
        const startCn = canvasNodesRef.current.get(arrowStartNodeIdRef.current)
        if (startCn) {
          const fromEdge = getEdgePoint(arrowEndPosRef.current.x, arrowEndPosRef.current.y, startCn)

          ctx.strokeStyle = "#22c55e"
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.beginPath()
          ctx.moveTo(fromEdge.x, fromEdge.y)
          ctx.lineTo(arrowEndPosRef.current.x, arrowEndPosRef.current.y)
          ctx.stroke()
          ctx.setLineDash([])

          // Draw circle at end
          ctx.beginPath()
          ctx.arc(arrowEndPosRef.current.x, arrowEndPosRef.current.y, 6, 0, Math.PI * 2)
          ctx.fillStyle = "#22c55e"
          ctx.fill()
        }
      }

      // Render nodes
      canvasNodesRef.current.forEach((cn) => {
        const isSelected = internalSelectionRef.current === cn.node.id
        const isFolder = cn.node.type === "folder"
        const childCount = isFolder ? getChildCountRef.current(cn.node.id) : 0
        const isArchived = !!cn.node.archivedAt
        const isUnsorted = cn.node.parentIds.length === 0 && cn.node.type === "file" && !isArchived

        // Node box
        const radius = 8
        ctx.beginPath()
        ctx.roundRect(cn.x - cn.width / 2, cn.y - cn.height / 2, cn.width, cn.height, radius)

        if (cn.isDragging) {
          ctx.fillStyle = "#3730a3"
          ctx.strokeStyle = "#818cf8"
          ctx.lineWidth = 2
        } else if (isSelected) {
          ctx.fillStyle = isFolder ? "#4f46e5" : "#3f3f46"
          ctx.strokeStyle = "#818cf8"
          ctx.lineWidth = 2
        } else if (isArchived) {
          // Archived nodes - grayed out
          ctx.fillStyle = "#1c1c1e"
          ctx.strokeStyle = "#3f3f46"
          ctx.lineWidth = 1
        } else if (isUnsorted) {
          // Unsorted nodes - amber highlight
          ctx.fillStyle = "#451a03"
          ctx.strokeStyle = "#f59e0b"
          ctx.lineWidth = 1
        } else {
          ctx.fillStyle = isFolder ? "#1e1b4b" : "#18181b"
          ctx.strokeStyle = isFolder ? "#4f46e5" : "#27272a"
          ctx.lineWidth = 1
        }
        ctx.fill()
        ctx.stroke()

        // Icon
        ctx.fillStyle = isArchived ? "#525252" : isUnsorted ? "#fbbf24" : isFolder ? "#a5b4fc" : "#71717a"
        ctx.font = "16px system-ui"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(isFolder ? "📁" : isArchived ? "📦" : "📄", cn.x - cn.width / 2 + 20, cn.y)

        // Name
        ctx.fillStyle = isSelected || cn.isDragging ? "#fff" : isArchived ? "#71717a" : "#a1a1aa"
        ctx.font = `${isSelected ? "600" : "400"} 13px system-ui`
        ctx.textAlign = "left"
        const displayName = cn.node.name.length > 14 ? cn.node.name.slice(0, 14) + "..." : cn.node.name
        ctx.fillText(displayName, cn.x - cn.width / 2 + 38, cn.y)

        // Child count badge
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

        // Multi-parent indicator
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

        // Expand/collapse chevron (always show)
        const isExpanded = expandedNodeIdRef.current === cn.node.id
        ctx.fillStyle = isExpanded ? "#a5b4fc" : "#71717a"
        ctx.font = "12px system-ui"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(isExpanded ? "▲" : "▼", cn.x + cn.width / 2 - 8, cn.y)

        // Expanded dropdown panel - full content view
        if (isExpanded) {
          const content = isFolder ? cn.node.description : cn.node.content
          const displayContent = content || (isFolder ? "No description" : "No content")
          const panelWidth = 350
          const lineHeight = 18
          const padding = 16
          const maxCharsPerLine = Math.floor((panelWidth - padding * 2) / 7.5)

          // Word wrap content, preserving newlines
          const paragraphs = displayContent.split('\n')
          const lines: string[] = []

          for (const para of paragraphs) {
            if (para.trim() === '') {
              lines.push('')
              continue
            }
            const words = para.split(' ')
            let currentLine = ''
            for (const word of words) {
              if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
                currentLine = currentLine ? currentLine + ' ' + word : word
              } else {
                if (currentLine) lines.push(currentLine)
                currentLine = word
              }
            }
            if (currentLine) lines.push(currentLine)
          }

          // Show up to 20 lines
          const maxLines = 20
          const displayLines = lines.slice(0, maxLines)
          const hasMore = lines.length > maxLines

          const panelHeight = Math.max(60, displayLines.length * lineHeight + padding * 2 + (hasMore ? 20 : 0))
          const panelX = cn.x - panelWidth / 2
          const panelY = cn.y + cn.height / 2 + 8

          // Panel shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
          ctx.shadowBlur = 20
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 4

          // Panel background
          ctx.beginPath()
          ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 8)
          ctx.fillStyle = "#0a0a0b"
          ctx.fill()

          // Reset shadow
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0

          // Border
          ctx.strokeStyle = isFolder ? "#4f46e5" : "#27272a"
          ctx.lineWidth = 1
          ctx.stroke()

          // Header line
          ctx.beginPath()
          ctx.moveTo(panelX, panelY + 32)
          ctx.lineTo(panelX + panelWidth, panelY + 32)
          ctx.strokeStyle = "#27272a"
          ctx.stroke()

          // Title
          ctx.fillStyle = "#f4f4f5"
          ctx.font = "bold 13px system-ui"
          ctx.textAlign = "left"
          ctx.textBaseline = "middle"
          ctx.fillText(isFolder ? "Description" : "Content", panelX + padding, panelY + 18)

          // Content text
          ctx.fillStyle = content ? "#a1a1aa" : "#525252"
          ctx.font = content ? "13px system-ui" : "italic 13px system-ui"
          ctx.textAlign = "left"
          ctx.textBaseline = "top"
          const contentStartY = panelY + 40
          displayLines.forEach((line, i) => {
            if (line === '') return // Skip empty lines but keep spacing
            ctx.fillText(line, panelX + padding, contentStartY + i * lineHeight)
          })

          // "More..." indicator
          if (hasMore) {
            ctx.fillStyle = "#6366f1"
            ctx.font = "italic 12px system-ui"
            ctx.fillText(`... ${lines.length - maxLines} more lines`, panelX + padding, contentStartY + displayLines.length * lineHeight + 4)
          }
        }
      })

      // Depth indicator
      ctx.fillStyle = "#3f3f46"
      ctx.font = "11px system-ui"
      ctx.textAlign = "right"
      ctx.fillText(`Depth: ${depth}`, width - 20, height - 20)

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
  }, [currentChildren, currentFolderId, depth, subMode, canMoveToParent, parentFolderId, savedPositions])

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const x = (e.clientX - rect.left - panRef.current.x - width / 2) / zoomRef.current + width / 2
    const y = (e.clientY - rect.top - panRef.current.y - height / 2) / zoomRef.current + height / 2
    return { x, y }
  }

  const findNodeAtPos = (x: number, y: number): CanvasNode | null => {
    let found: CanvasNode | null = null
    canvasNodesRef.current.forEach((cn) => {
      if (x >= cn.x - cn.width / 2 && x <= cn.x + cn.width / 2 && y >= cn.y - cn.height / 2 && y <= cn.y + cn.height / 2) {
        found = cn
      }
    })
    return found
  }

  // Helper to get nearest edge point on a node (for arrow connections)
  const getEdgePoint = (fromX: number, fromY: number, node: CanvasNode) => {
    const dx = fromX - node.x
    const dy = fromY - node.y
    const angle = Math.atan2(dy, dx)

    const hw = node.width / 2
    const hh = node.height / 2

    let edgeX: number, edgeY: number
    const tanAngle = Math.abs(Math.tan(angle))

    if (tanAngle * hw <= hh) {
      edgeX = node.x + (dx > 0 ? hw : -hw)
      edgeY = node.y + (dx > 0 ? hw : -hw) * Math.tan(angle)
    } else {
      edgeY = node.y + (dy > 0 ? hh : -hh)
      edgeX = node.x + (dy > 0 ? hh : -hh) / Math.tan(angle)
    }

    return { x: edgeX, y: edgeY }
  }

  // Get label position for a connection (uses edge points like drawing does)
  const getConnectionLabelPos = (connIndex: number): { x: number; y: number } | null => {
    const conn = connectionsRef.current[connIndex]
    if (!conn) return null

    const fromCn = canvasNodesRef.current.get(conn.from)
    const toCn = canvasNodesRef.current.get(conn.to)
    if (!fromCn || !toCn) return null

    // Get edge points (same as drawing code)
    const fromEdge = getEdgePoint(toCn.x, toCn.y, fromCn)
    const toEdge = getEdgePoint(fromCn.x, fromCn.y, toCn)

    // Calculate the curve midpoint (same logic as drawArrow)
    const dx = toEdge.x - fromEdge.x
    const dy = toEdge.y - fromEdge.y
    const midX = fromEdge.x + dx / 2
    const midY = fromEdge.y + dy / 2
    const dist = Math.sqrt(dx * dx + dy * dy)
    const curveOffset = Math.min(50, dist * 0.2)
    const perpX = -dy / dist * curveOffset
    const perpY = dx / dist * curveOffset
    const cp1x = midX + perpX
    const cp1y = midY + perpY

    const t = 0.5
    const labelX = (1 - t) * (1 - t) * fromEdge.x + 2 * (1 - t) * t * cp1x + t * t * toEdge.x
    const labelY = (1 - t) * (1 - t) * fromEdge.y + 2 * (1 - t) * t * cp1y + t * t * toEdge.y

    return { x: labelX, y: labelY }
  }

  // Find if a point is near a connection line or label
  const findConnectionAtPos = (x: number, y: number): number | null => {
    const threshold = 10
    const conns = connectionsRef.current

    for (let i = 0; i < conns.length; i++) {
      const conn = conns[i]
      const fromCn = canvasNodesRef.current.get(conn.from)
      const toCn = canvasNodesRef.current.get(conn.to)

      if (!fromCn || !toCn) continue

      // Check if clicking on the label area first (higher priority)
      if (conn.label) {
        const labelPos = getConnectionLabelPos(i)
        if (labelPos) {
          // Estimate label dimensions (similar to what drawArrow uses)
          const labelWidth = conn.label.length * 7 + 16 // rough estimate: ~7px per char + padding
          const labelHeight = 20

          if (
            x >= labelPos.x - labelWidth / 2 &&
            x <= labelPos.x + labelWidth / 2 &&
            y >= labelPos.y - labelHeight / 2 &&
            y <= labelPos.y + labelHeight / 2
          ) {
            return i
          }
        }
      }

      // Simple distance to line segment check
      const x1 = fromCn.x, y1 = fromCn.y
      const x2 = toCn.x, y2 = toCn.y

      const A = x - x1
      const B = y - y1
      const C = x2 - x1
      const D = y2 - y1

      const dot = A * C + B * D
      const lenSq = C * C + D * D
      let param = -1

      if (lenSq !== 0) param = dot / lenSq

      let xx, yy

      if (param < 0) {
        xx = x1
        yy = y1
      } else if (param > 1) {
        xx = x2
        yy = y2
      } else {
        xx = x1 + param * C
        yy = y1 + param * D
      }

      const dist = Math.sqrt((x - xx) ** 2 + (y - yy) ** 2)
      if (dist < threshold) {
        return i
      }
    }

    return null
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e)
    const cn = findNodeAtPos(pos.x, pos.y)

    // Click on drop zone bar to navigate up
    if (pos.y < DROP_ZONE_HEIGHT && canMoveToParent && !cn) {
      navigateUp()
      return
    }

    // Shift+click on node starts arrow drawing
    if (e.shiftKey && cn) {
      setIsDrawingArrow(true)
      setArrowStartNodeId(cn.node.id)
      setArrowEndPos(pos)
      setSelectedConnectionIndex(null)
      return
    }

    if (cn) {
      // Check if clicking on the chevron area (right edge of node) to toggle expansion
      const chevronX = cn.x + cn.width / 2 - 8
      const isClickingChevron = Math.abs(pos.x - chevronX) < 15 && Math.abs(pos.y - cn.y) < cn.height / 2

      if (isClickingChevron) {
        setExpandedNodeId(expandedNodeId === cn.node.id ? null : cn.node.id)
        setInternalSelection(cn.node.id)
        return
      }

      setInternalSelection(cn.node.id)
      setSelectedConnectionIndex(null)
      setExpandedNodeId(null) // Collapse when selecting a different node
      setDraggingNodeId(cn.node.id)
      cn.isDragging = true
      cn.dragOffsetX = pos.x - cn.x
      cn.dragOffsetY = pos.y - cn.y
    } else {
      // Check if clicking on an arrow
      const connIndex = findConnectionAtPos(pos.x, pos.y)
      if (connIndex !== null) {
        setSelectedConnectionIndex(connIndex)
        setInternalSelection(null)
      } else {
        setInternalSelection(null)
        setSelectedConnectionIndex(null)
        setIsPanning(true)
        lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      }
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(e)

    // Arrow drawing mode
    if (isDrawingArrow) {
      setArrowEndPos(pos)
      return
    }

    if (isPanning) {
      const dx = e.clientX - lastMousePosRef.current.x
      const dy = e.clientY - lastMousePosRef.current.y
      const PAN_BOUND = 300
      // Update ref directly to avoid re-renders during pan
      panRef.current = {
        x: Math.max(-PAN_BOUND, Math.min(PAN_BOUND, panRef.current.x + dx)),
        y: Math.max(-PAN_BOUND, Math.min(PAN_BOUND, panRef.current.y + dy)),
      }
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
    } else if (draggingNodeId) {
      const cn = canvasNodesRef.current.get(draggingNodeId)
      if (cn) {
        cn.x = pos.x - cn.dragOffsetX
        cn.y = pos.y - cn.dragOffsetY

        // Update ref directly to avoid re-renders during drag
        isOverDropZoneRef.current = canMoveToParent && pos.y < DROP_ZONE_HEIGHT
      }
    }
  }

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    // Complete arrow drawing
    if (isDrawingArrow && arrowStartNodeId && arrowEndPos) {
      const pos = getMousePos(e)
      const targetCn = findNodeAtPos(pos.x, pos.y)

      if (targetCn && targetCn.node.id !== arrowStartNodeId) {
        // Check if connection already exists (use ref for immediate check)
        const exists = connectionsRef.current.some(
          (c) =>
            (c.from === arrowStartNodeId && c.to === targetCn.node.id) ||
            (c.from === targetCn.node.id && c.to === arrowStartNodeId)
        )

        if (!exists) {
          const newConnection: Connection = {
            from: arrowStartNodeId,
            to: targetCn.node.id,
          }
          // Update ref immediately so animation loop picks it up
          const newConnections = [...connectionsRef.current, newConnection]
          connectionsRef.current = newConnections
          saveConnections(currentFolderId, newConnections)
          setConnections(newConnections)
        }
      }

      setIsDrawingArrow(false)
      setArrowStartNodeId(null)
      setArrowEndPos(null)
      return
    }

    if (draggingNodeId) {
      const cn = canvasNodesRef.current.get(draggingNodeId)
      if (cn) {
        if (isOverDropZone && canMoveToParent) {
          // Move to parent folder
          onMoveNode(cn.node, parentFolderId)
        } else {
          // Clamp position to stay below drop zone
          const clampedY = Math.max(DROP_ZONE_HEIGHT + cn.height / 2 + 10, cn.y)
          cn.y = clampedY
          // Save the new position
          saveNodePosition(cn.node.id, cn.x, cn.y)
        }
        cn.isDragging = false
      }
      setDraggingNodeId(null)
      setIsOverDropZone(false)
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
      return
    }

    // Check if double-clicking on a connection to edit label
    const connIndex = findConnectionAtPos(pos.x, pos.y)
    if (connIndex !== null) {
      const labelPos = getConnectionLabelPos(connIndex)
      if (labelPos) {
        // Convert canvas coords to screen coords for the input
        const canvas = canvasRef.current
        if (canvas) {
          const rect = canvas.getBoundingClientRect()
          const screenX = (labelPos.x - rect.width / 2) * zoomRef.current + panRef.current.x + rect.width / 2
          const screenY = (labelPos.y - rect.height / 2) * zoomRef.current + panRef.current.y + rect.height / 2

          setEditingConnectionIndex(connIndex)
          setEditingLabelPos({ x: screenX, y: screenY })
          setEditingLabelValue(connectionsRef.current[connIndex].label || "")
        }
      }
    }
  }

  const saveConnectionLabel = () => {
    if (editingConnectionIndex === null) return

    const newConnections = [...connectionsRef.current]
    newConnections[editingConnectionIndex] = {
      ...newConnections[editingConnectionIndex],
      label: editingLabelValue.trim() || undefined
    }
    connectionsRef.current = newConnections
    saveConnections(currentFolderId, newConnections)
    setConnections(newConnections)

    setEditingConnectionIndex(null)
    setEditingLabelPos(null)
    setEditingLabelValue("")
  }

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const pos = getMousePos(e)
    const cn = findNodeAtPos(pos.x, pos.y)

    if (cn) {
      // Show context menu at mouse position (screen coords)
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        nodeId: cn.node.id
      })
    } else {
      setContextMenu(null)
    }
  }

  const startEditingNodeField = (nodeId: string, field: 'name' | 'description') => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    const value = field === 'name' ? node.name : (node.description || '')
    setEditingNodeField({ nodeId, field })
    setEditingNodeValue(value)
    setContextMenu(null)
  }

  const saveNodeField = () => {
    if (!editingNodeField) return

    const { nodeId, field } = editingNodeField
    const value = editingNodeValue.trim()

    if (field === 'name' && !value) {
      // Don't allow empty name
      setEditingNodeField(null)
      setEditingNodeValue("")
      return
    }

    // Update local canvas state optimistically
    const cn = canvasNodesRef.current.get(nodeId)
    if (cn) {
      if (field === 'name') {
        cn.node.name = value
      } else {
        cn.node.description = value || null
      }
    }

    // Notify parent to update the actual node
    if (onUpdateNode) {
      onUpdateNode(nodeId, { [field]: field === 'description' ? (value || null) : value })
    }

    setEditingNodeField(null)
    setEditingNodeValue("")
  }

  const MIN_ZOOM = 0.5
  const MAX_ZOOM = 1.5

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom((prev) => Math.min(Math.max(prev + delta, MIN_ZOOM), MAX_ZOOM))
    }
  }

  // Handle journal creation
  const handleCreateJournal = (type: "daily" | "weekly" | "monthly") => {
    const today = new Date()
    let title = ""
    let id = ""

    if (type === "daily") {
      title = format(today, "EEEE, MMM d")
      id = `daily-${format(today, "yyyy-MM-dd")}`
    } else if (type === "weekly") {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 })
      title = `Week of ${format(weekStart, "MMM d")}`
      id = `weekly-${format(weekStart, "yyyy-MM-dd")}`
    } else {
      const monthStart = startOfMonth(today)
      title = format(monthStart, "MMMM yyyy")
      id = `monthly-${format(monthStart, "yyyy-MM")}`
    }

    // Create a journal node and open it
    const journalNode: Node = {
      id,
      type: "file",
      name: title,
      parentIds: [],
      createdAt: today,
      updatedAt: today,
      archivedAt: null,
    }
    onSelectNode(journalNode)
  }

  return (
    <div className="relative h-full w-full bg-background overflow-hidden">
      {/* Journal timeline view */}
      {subMode === "journal" ? (
        <JournalTimeline onSelectJournal={onSelectNode} nodes={nodes} />
      ) : (
        /* Canvas container - unified view for ideas/unsorted/archive */
        <div ref={containerRef} className="absolute inset-0">
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={(e) => handleCanvasMouseUp(e)}
            onDoubleClick={handleCanvasDoubleClick}
            onWheel={handleWheel}
            onContextMenu={handleCanvasContextMenu}
            className={`w-full h-full ${isDrawingArrow ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
          />
        </div>
      )}

      {/* Floating header tabs */}
      <CastleHeader
        subMode={subMode}
        onSubModeChange={handleSubModeChange}
        unsortedCount={unsortedNodes.length}
        archivedCount={archivedNodes.length}
        onCreateNode={onCreateNode}
        onCreateJournal={handleCreateJournal}
        currentFolderId={currentFolderId}
      />

      {/* Canvas overlays */}
      <>
          {/* Label editing input */}
          {editingConnectionIndex !== null && editingLabelPos && (
            <input
              type="text"
              value={editingLabelValue}
              onChange={(e) => setEditingLabelValue(e.target.value)}
              onBlur={saveConnectionLabel}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  saveConnectionLabel()
                } else if (e.key === "Escape") {
                  setEditingConnectionIndex(null)
                  setEditingLabelPos(null)
                  setEditingLabelValue("")
                }
              }}
              autoFocus
              placeholder="Label..."
              className="absolute bg-zinc-900 border border-indigo-500 text-white text-xs px-2 py-1 rounded outline-none focus:ring-2 focus:ring-indigo-500 min-w-[80px] z-30"
              style={{
                left: editingLabelPos.x,
                top: editingLabelPos.y,
                transform: "translate(-50%, -50%)"
              }}
            />
          )}

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
            <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.min(z + 0.2, MAX_ZOOM))} className="bg-zinc-900/80 border-zinc-700">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.max(z - 0.2, MIN_ZOOM))} className="bg-zinc-900/80 border-zinc-700">
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation up button */}
          <div className="absolute bottom-4 left-4 flex gap-2 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={navigateUp}
              disabled={navigationHistory.length <= 1}
              className="gap-1 bg-zinc-900/80 border-zinc-700"
            >
              <ChevronUp className="h-4 w-4" />
              Up
            </Button>
          </div>

          {/* Help text */}
          <div className="absolute top-16 right-4 text-xs text-zinc-500 bg-zinc-900/80 px-3 py-2 rounded-md z-10">
            <div>Double-click folder to enter</div>
            <div>Click chevron to expand</div>
            <div>Right-click to edit</div>
            <div>Shift+drag for arrows</div>
          </div>
      </>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 z-50 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              className="w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
              onClick={() => startEditingNodeField(contextMenu.nodeId, 'name')}
            >
              <span className="text-zinc-400">Aa</span>
              Rename
            </button>
            <button
              className="w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
              onClick={() => startEditingNodeField(contextMenu.nodeId, 'description')}
            >
              <span className="text-zinc-400">T</span>
              Edit Description
            </button>
            <div className="border-t border-zinc-700 my-1" />
            <button
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 flex items-center gap-2"
              onClick={() => {
                const node = nodes.find(n => n.id === contextMenu.nodeId)
                if (node) {
                  handleDeleteRequest(node)
                }
                setContextMenu(null)
              }}
            >
              <span>Delete</span>
            </button>
          </div>
        </>
      )}

      {/* Node field editing modal */}
      {editingNodeField && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 w-[400px] shadow-xl">
            <h3 className="text-sm font-medium text-zinc-200 mb-3">
              {editingNodeField.field === 'name' ? 'Rename' : 'Edit Description'}
            </h3>
            {editingNodeField.field === 'name' ? (
              <input
                type="text"
                value={editingNodeValue}
                onChange={(e) => setEditingNodeValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveNodeField()
                  else if (e.key === 'Escape') {
                    setEditingNodeField(null)
                    setEditingNodeValue("")
                  }
                }}
                autoFocus
                className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                placeholder="Enter name..."
              />
            ) : (
              <textarea
                value={editingNodeValue}
                onChange={(e) => setEditingNodeValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditingNodeField(null)
                    setEditingNodeValue("")
                  }
                }}
                autoFocus
                rows={4}
                className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 resize-none"
                placeholder="Enter description..."
              />
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingNodeField(null)
                  setEditingNodeValue("")
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveNodeField}
              >
                Save
              </Button>
            </div>
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
              This will permanently delete "{deleteConfirmNode?.name}" and all {getChildCount(deleteConfirmNode?.id || "")}{" "}
              items inside. This action cannot be undone.
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
