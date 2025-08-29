"use client"

import { useState, useEffect } from "react"
import { Save, Edit3 } from "lucide-react"
import { format } from "date-fns"
import type { JournalEntry } from "@/types/journal-types"

type JournalContentProps = {
  selectedItem: JournalEntry | null
  onUpdateContent: (content: string) => void
}

export function JournalContent({ selectedItem, onUpdateContent }: JournalContentProps) {
  const [content, setContent] = useState("")
  const [title, setTitle] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    if (selectedItem) {
      setContent(selectedItem.content || "")
      setTitle(selectedItem.title)
      setIsEditing(false)
      setHasUnsavedChanges(false)
    }
  }, [selectedItem])

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    setHasUnsavedChanges(true)
  }

  const handleSave = () => {
    onUpdateContent(content)
    setHasUnsavedChanges(false)
    setIsEditing(false)
  }

  if (!selectedItem) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
        }}
      >
        <div style={{ textAlign: "center", color: "#666" }}>
          <Edit3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 style={{ fontSize: "1.125rem", marginBottom: "8px", color: "#333" }}>Select a note to start writing</h3>
          <p style={{ fontSize: "14px" }}>Choose a note from the sidebar or create a new one</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "white" }}>
      {/* Header */}
      <div
        style={{
          padding: "20px 24px 16px 24px",
          borderBottom: "1px solid #e0e0e0",
          background: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              fontSize: "1.5rem",
              fontWeight: "600",
              color: "#1a1a1a",
              border: "none",
              background: "transparent",
              outline: "none",
              fontFamily: "Georgia, serif",
              flex: 1,
              marginRight: "16px",
            }}
            placeholder="Note title..."
          />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {hasUnsavedChanges && (
              <span style={{ fontSize: "12px", color: "#f59e0b", fontWeight: "500" }}>Unsaved changes</span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className="btn btn-primary"
              style={{
                fontSize: "13px",
                padding: "6px 12px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                opacity: hasUnsavedChanges ? 1 : 0.5,
              }}
            >
              <Save className="h-3 w-3" />
              Save
            </button>
          </div>
        </div>
        <div style={{ fontSize: "13px", color: "#666" }}>
          Last updated: {format(new Date(selectedItem.updatedAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, padding: "0" }}>
        <div
          style={{
            background: "#f8f8f8",
            padding: "12px 24px",
            borderBottom: "1px solid #e0e0e0",
            fontSize: "13px",
            color: "#666",
          }}
        >
          {"Markdown Editor - Use **bold**, *italic*, # headers, - lists, > quotes"}
        </div>
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          style={{
            width: "100%",
            height: "calc(100vh - 200px)",
            padding: "24px",
            border: "none",
            outline: "none",
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            fontSize: "14px",
            lineHeight: "1.6",
            resize: "none",
            background: "white",
          }}
          placeholder="Start writing your thoughts..."
        />
      </div>
    </div>
  )
}
