"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import type { JournalEntry } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  X,
  Save,
  Trash2,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link,
  ImageIcon,
  CheckSquare,
  Minus,
  Eye,
  Edit3,
} from "lucide-react"

interface EntryEditorProps {
  entry?: JournalEntry | null
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Partial<JournalEntry>) => void
  onDelete?: (entry: JournalEntry) => void
  initialDate?: Date
}

export function EntryEditor({ entry, isOpen, onClose, onSave, onDelete, initialDate }: EntryEditorProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("edit")
  const editorRef = useRef<HTMLTextAreaElement>(null)

  const isEditing = !!entry

  useEffect(() => {
    if (entry) {
      setTitle(entry.title)
      setContent(entry.content || "")
    } else {
      setTitle("")
      setContent("")
    }
  }, [entry, isOpen])

  const insertMarkdown = useCallback(
    (before: string, after = "", placeholder = "") => {
      const textarea = editorRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = content.substring(start, end)
      const textToInsert = selectedText || placeholder

      const newContent = content.substring(0, start) + before + textToInsert + after + content.substring(end)

      setContent(newContent)

      // Set cursor position
      setTimeout(() => {
        textarea.focus()
        const newCursorPos = start + before.length + textToInsert.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    },
    [content],
  )

  const insertAtLineStart = useCallback(
    (prefix: string) => {
      const textarea = editorRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const lineStart = content.lastIndexOf("\n", start - 1) + 1

      const newContent = content.substring(0, lineStart) + prefix + content.substring(lineStart)

      setContent(newContent)

      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + prefix.length, start + prefix.length)
      }, 0)
    },
    [content],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "b":
            e.preventDefault()
            insertMarkdown("**", "**", "bold")
            break
          case "i":
            e.preventDefault()
            insertMarkdown("*", "*", "italic")
            break
          case "k":
            e.preventDefault()
            insertMarkdown("[", "](url)", "link text")
            break
        }
      }
    },
    [insertMarkdown],
  )

  const handleSave = () => {
    const data: Partial<JournalEntry> = {
      title: title || "Untitled Entry",
      content,
    }

    if (entry) {
      data.id = entry.id
    }

    if (initialDate && !entry) {
      data.createdAt = initialDate
    }

    onSave(data)
    onClose()
  }

  const handleDelete = () => {
    if (entry && onDelete) {
      onDelete(entry)
      onClose()
    }
  }

  // Simple markdown to HTML converter
  const renderMarkdown = (text: string) => {
    const html = text
      // Escape HTML
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-5 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3">$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/~~(.+?)~~/g, '<del class="text-muted-foreground">$1</del>')
      // Code
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]$$([^)]+)$$/g, '<a href="$2" class="text-primary underline">$1</a>')
      // Blockquotes
      .replace(
        /^> (.+)$/gm,
        '<blockquote class="border-l-2 border-primary/50 pl-4 italic text-muted-foreground">$1</blockquote>',
      )
      // Horizontal rule
      .replace(/^---$/gm, '<hr class="border-border my-4" />')
      // Task lists
      .replace(
        /^- \[x\] (.+)$/gm,
        '<div class="flex items-center gap-2"><input type="checkbox" checked disabled class="rounded" /><span class="line-through text-muted-foreground">$1</span></div>',
      )
      .replace(
        /^- \[ \] (.+)$/gm,
        '<div class="flex items-center gap-2"><input type="checkbox" disabled class="rounded" /><span>$1</span></div>',
      )
      // Unordered lists
      .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p class="my-2">')
      .replace(/\n/g, "<br />")

    return `<p class="my-2">${html}</p>`
  }

  if (!isOpen) return null

  const ToolbarButton = ({
    icon: Icon,
    onClick,
    title,
    active = false,
  }: {
    icon: typeof Bold
    onClick: () => void
    title: string
    active?: boolean
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-muted transition-colors ${active ? "bg-muted text-primary" : "text-muted-foreground"}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )

  const ToolbarDivider = () => <div className="w-px h-5 bg-border mx-1" />

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl h-[90vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header with title */}
        <div className="flex items-center gap-4 border-b border-border/50 px-4 py-3 bg-muted/30">
          <input
            type="text"
            placeholder="Untitled"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 bg-transparent text-xl font-semibold outline-none placeholder:text-muted-foreground/50"
          />
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border/50 bg-muted/20 flex-wrap">
          <ToolbarButton icon={Bold} onClick={() => insertMarkdown("**", "**", "bold")} title="Bold (Ctrl+B)" />
          <ToolbarButton icon={Italic} onClick={() => insertMarkdown("*", "*", "italic")} title="Italic (Ctrl+I)" />
          <ToolbarButton
            icon={Strikethrough}
            onClick={() => insertMarkdown("~~", "~~", "strikethrough")}
            title="Strikethrough"
          />
          <ToolbarButton icon={Code} onClick={() => insertMarkdown("`", "`", "code")} title="Inline Code" />

          <ToolbarDivider />

          <ToolbarButton icon={Heading1} onClick={() => insertAtLineStart("# ")} title="Heading 1" />
          <ToolbarButton icon={Heading2} onClick={() => insertAtLineStart("## ")} title="Heading 2" />
          <ToolbarButton icon={Heading3} onClick={() => insertAtLineStart("### ")} title="Heading 3" />

          <ToolbarDivider />

          <ToolbarButton icon={List} onClick={() => insertAtLineStart("- ")} title="Bullet List" />
          <ToolbarButton icon={ListOrdered} onClick={() => insertAtLineStart("1. ")} title="Numbered List" />
          <ToolbarButton icon={CheckSquare} onClick={() => insertAtLineStart("- [ ] ")} title="Task List" />

          <ToolbarDivider />

          <ToolbarButton icon={Quote} onClick={() => insertAtLineStart("> ")} title="Quote" />
          <ToolbarButton icon={Minus} onClick={() => insertMarkdown("\n---\n", "", "")} title="Horizontal Rule" />
          <ToolbarButton icon={Link} onClick={() => insertMarkdown("[", "](url)", "link text")} title="Link (Ctrl+K)" />
          <ToolbarButton icon={ImageIcon} onClick={() => insertMarkdown("![", "](url)", "alt text")} title="Image" />

          <div className="flex-1" />

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("edit")}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === "edit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === "split" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Editor / Preview area */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Editor */}
          {(viewMode === "edit" || viewMode === "split") && (
            <div className={`${viewMode === "split" ? "w-1/2 border-r border-border/50" : "w-full"} flex flex-col`}>
              <textarea
                ref={editorRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Start writing... (supports Markdown)"
                className="flex-1 w-full p-4 bg-transparent outline-none resize-none font-mono text-sm leading-relaxed placeholder:text-muted-foreground/50"
                spellCheck={false}
              />
            </div>
          )}

          {/* Preview */}
          {(viewMode === "preview" || viewMode === "split") && (
            <div className={`${viewMode === "split" ? "w-1/2" : "w-full"} overflow-auto`}>
              <div
                className="p-4 prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/50 px-4 py-3 bg-muted/20">
          <div>
            {isEditing && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive gap-2"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground mr-2">{content.length} characters</span>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              {isEditing ? "Save Changes" : "Create Entry"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
