"use client"

import { useState, useEffect } from "react"
import type { JournalEntry, Folder, Node } from "@/lib/types"
import CastleView from "./castle/castle-view"
import { FolderEditor } from "@/components/editor/folder-editor"
import { useElectronFS } from "@/lib/hooks/useElectronFS"
import { WorkspaceHeader } from "./file-system/workspace-header"

interface JournalViewProps {
  entries: JournalEntry[]
  folders: Folder[]
  onSelectEntry: (entry: JournalEntry | null) => void
  onOpenEntry?: (entry: JournalEntry) => void // Opens full editor
  selectedEntry: JournalEntry | null
  onCreateEntry: () => void
  onCreateFolder: (parentId: string | null) => void
  onDeleteEntry: (entry: JournalEntry) => void
  onDeleteFolder: (folder: Folder) => void
  onRenameFolder: (folder: Folder) => void
}

export function JournalView({
  entries,
  folders,
  onSelectEntry,
  onOpenEntry,
  selectedEntry,
  onCreateEntry,
  onCreateFolder,
  onDeleteEntry,
  onDeleteFolder,
  onRenameFolder,
}: JournalViewProps) {
  // Electron file system integration
  const {
    isElectron,
    currentFolder,
    nodes: electronNodes,
    openWorkspaceInFinder,
    readFile,
    writeFile,
    createFolder: createElectronFolder,
    deletePath,
    renamePath,
    refreshFolder,
    loading: fsLoading,
  } = useElectronFS()

  const [nodes, setNodes] = useState<Node[]>(() => {
    const folderNodes: Node[] = folders.map((f) => ({
      id: f.id,
      type: "folder" as const,
      name: f.name,
      description: f.description || null,
      parentIds: f.parentId ? [f.parentId] : f.isRoot ? [] : ["all-entries"],
      createdAt: f.createdAt || new Date(),
      updatedAt: f.updatedAt || new Date(),
      archivedAt: null,
    }))

    const entryNodes: Node[] = entries.map((e) => ({
      id: e.id,
      type: "file" as const,
      name: e.title,
      content: e.content,
      parentIds: e.folderId ? [e.folderId] : ["all-entries"],
      createdAt: new Date(e.createdAt),
      updatedAt: new Date(e.updatedAt),
      archivedAt: null,
      mood: e.mood,
      energy: e.energy,
      clarity: e.clarity,
    }))

    return [...folderNodes, ...entryNodes]
  })

  // Use Electron nodes when available
  useEffect(() => {
    if (isElectron && electronNodes.length > 0) {
      setNodes(electronNodes)
    }
  }, [isElectron, electronNodes])

  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showFolderEditor, setShowFolderEditor] = useState(false)
  const [folderEditorMode, setFolderEditorMode] = useState<"create" | "rename">("create")
  const [pendingFolderParentId, setPendingFolderParentId] = useState<string | null>(null)
  const [renamingNode, setRenamingNode] = useState<Node | null>(null)

  const handleSelectNode = async (node: Node | null) => {
    setSelectedNode(node)

    if (node?.type === "file") {
      // If using Electron, read file content
      if (isElectron && node.path) {
        const content = await readFile(node.path)
        if (content !== null) {
          // Create a temporary entry to display
          const tempEntry: JournalEntry = {
            id: node.id,
            title: node.name,
            content,
            createdAt: node.createdAt,
            updatedAt: node.updatedAt,
            userId: "local",
          }
          // Open full editor if handler provided, otherwise show detail panel
          if (onOpenEntry) {
            onOpenEntry(tempEntry)
          } else {
            onSelectEntry(tempEntry)
          }
        }
      } else {
        const entry = entries.find((e) => e.id === node.id)
        if (entry) {
          // Open full editor if handler provided, otherwise show detail panel
          if (onOpenEntry) {
            onOpenEntry(entry)
          } else {
            onSelectEntry(entry)
          }
        }
      }
    } else {
      onSelectEntry(null)
    }
  }

  const handleCreateNode = (type: "folder" | "file", parentId: string | null) => {
    if (type === "folder") {
      setPendingFolderParentId(parentId)
      setFolderEditorMode("create")
      setRenamingNode(null)
      setShowFolderEditor(true)
    } else {
      onCreateEntry()
    }
  }

  const handleSaveFolder = (name: string, description: string) => {
    if (folderEditorMode === "create") {
      const newNode: Node = {
        id: `folder-${Date.now()}`,
        type: "folder",
        name: name,
        description: description || null,
        parentIds: pendingFolderParentId ? [pendingFolderParentId] : [],
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      }
      setNodes((prev) => [...prev, newNode])
    } else if (renamingNode) {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === renamingNode.id ? { ...n, name, description: description || null, updatedAt: new Date() } : n,
        ),
      )
    }
  }

  const handleDeleteNode = (node: Node) => {
    setNodes((prev) => prev.filter((n) => n.id !== node.id))
    if (node.type === "folder") {
      const folder = folders.find((f) => f.id === node.id)
      if (folder) onDeleteFolder(folder)
    } else {
      const entry = entries.find((e) => e.id === node.id)
      if (entry) onDeleteEntry(entry)
    }
  }

  const handleMoveNode = (node: Node, newParentId: string | null) => {
    if (newParentId !== null) {
      const targetNode = nodes.find((n) => n.id === newParentId)
      if (!targetNode || targetNode.type !== "folder") {
        return
      }
    }

    setNodes((prev) =>
      prev.map((n) =>
        n.id === node.id ? { ...n, parentIds: newParentId ? [newParentId] : [], updatedAt: new Date() } : n,
      ),
    )
  }

  const handleUpdateNode = (nodeId: string, updates: { name?: string; description?: string | null }) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, ...updates, updatedAt: new Date() } : n,
      ),
    )
  }

  return (
    <div className="h-full w-full flex flex-col">
      {isElectron && (
        <WorkspaceHeader
          currentFolder={currentFolder}
          onOpenInFinder={openWorkspaceInFinder}
          onRefresh={() => refreshFolder && refreshFolder()}
          onCreateFile={() => handleCreateNode("file", null)}
        />
      )}

      {fsLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <CastleView
            nodes={nodes}
            onSelectNode={handleSelectNode}
            onCreateNode={handleCreateNode}
            onDeleteNode={handleDeleteNode}
            onMoveNode={handleMoveNode}
            onUpdateNode={handleUpdateNode}
          />
        </div>
      )}

      <FolderEditor
        isOpen={showFolderEditor}
        onClose={() => {
          setShowFolderEditor(false)
          setRenamingNode(null)
        }}
        onSave={handleSaveFolder}
        initialName={renamingNode?.name || ""}
        initialDescription={renamingNode?.description || ""}
        mode={folderEditorMode}
      />
    </div>
  )
}
