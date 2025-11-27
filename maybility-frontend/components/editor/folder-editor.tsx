"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, Folder } from "lucide-react"

interface FolderEditorProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, description: string) => void
  initialName?: string
  initialDescription?: string
  mode?: "create" | "rename"
}

export function FolderEditor({
  isOpen,
  onClose,
  onSave,
  initialName = "",
  initialDescription = "",
  mode = "create",
}: FolderEditorProps) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)

  useEffect(() => {
    if (isOpen) {
      setName(initialName)
      setDescription(initialDescription)
    }
  }, [isOpen, initialName, initialDescription])

  if (!isOpen) return null

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), description.trim())
      setName("")
      setDescription("")
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSave()
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-background border border-border rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{mode === "create" ? "New Folder" : "Edit Folder"}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <Label htmlFor="folder-name" className="text-sm text-muted-foreground">
              Folder Name
            </Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter folder name..."
              className="mt-2"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="folder-description" className="text-sm text-muted-foreground">
              Description <span className="text-muted-foreground/60">(optional)</span>
            </Label>
            <Textarea
              id="folder-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What is this folder for..."
              className="mt-2 min-h-[80px] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-border">
          <span className="text-xs text-muted-foreground">Ctrl+Enter to save</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {mode === "create" ? "Create Folder" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
