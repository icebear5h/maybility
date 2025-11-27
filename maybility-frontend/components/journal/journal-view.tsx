"use client"

import { useState } from "react"
import type { JournalEntry, Folder, Node } from "@/lib/types"
import CastleView from "./castle-view"
import { FolderEditor } from "@/components/editor/folder-editor"

interface JournalViewProps {
  entries: JournalEntry[]
  folders: Folder[]
  onSelectEntry: (entry: JournalEntry | null) => void
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
  selectedEntry,
  onCreateEntry,
  onCreateFolder,
  onDeleteEntry,
  onDeleteFolder,
  onRenameFolder,
}: JournalViewProps) {
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

  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showFolderEditor, setShowFolderEditor] = useState(false)
  const [folderEditorMode, setFolderEditorMode] = useState<"create" | "rename">("create")
  const [pendingFolderParentId, setPendingFolderParentId] = useState<string | null>(null)
  const [renamingNode, setRenamingNode] = useState<Node | null>(null)

  const handleSelectNode = (node: Node | null) => {
    setSelectedNode(node)
    if (node?.type === "file") {
      const entry = entries.find((e) => e.id === node.id)
      onSelectEntry(entry || null)
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

  const handleArchiveNode = (node: Node) => {
    setNodes((prev) => prev.map((n) => (n.id === node.id ? { ...n, archivedAt: new Date() } : n)))
  }

  const handleRestoreNode = (node: Node) => {
    setNodes((prev) => prev.map((n) => (n.id === node.id ? { ...n, archivedAt: null } : n)))
  }

  const handleRenameNode = (node: Node) => {
    if (node.type === "folder") {
      setRenamingNode(node)
      setFolderEditorMode("rename")
      setShowFolderEditor(true)
    } else {
      const newName = prompt("Enter new name:", node.name)
      if (newName) {
        setNodes((prev) => prev.map((n) => (n.id === node.id ? { ...n, name: newName, updatedAt: new Date() } : n)))
      }
    }
  }

  const handleAddParent = (node: Node, parentId: string) => {
    if (!node.parentIds.includes(parentId)) {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === node.id ? { ...n, parentIds: [...n.parentIds, parentId], updatedAt: new Date() } : n,
        ),
      )
    }
  }

  const handleRemoveParent = (node: Node, parentId: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === node.id ? { ...n, parentIds: n.parentIds.filter((id) => id !== parentId), updatedAt: new Date() } : n,
      ),
    )
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

  return (
    <div className="h-full w-full">
      <CastleView
        nodes={nodes}
        onSelectNode={handleSelectNode}
        onCreateNode={handleCreateNode}
        onDeleteNode={handleDeleteNode}
        onMoveNode={handleMoveNode}
      />
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
