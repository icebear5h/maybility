"use client"

import { useState, useEffect } from "react"
import type { Stage, Goal } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { X, Trash2, Flag } from "lucide-react"
import { cn } from "@/lib/utils"

interface StageEditorProps {
  stage: Stage | null
  goal: Goal | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Stage>) => void
  onDelete?: (stage: Stage) => void
}

const colors = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
]

export function StageEditor({ stage, goal, isOpen, onClose, onSave, onDelete }: StageEditorProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [color, setColor] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (stage) {
      setTitle(stage.title)
      setDescription(stage.description || "")
      setTargetDate(stage.targetDate ? new Date(stage.targetDate).toISOString().split("T")[0] : "")
      setColor(stage.color || null)
    } else {
      setTitle("")
      setDescription("")
      setTargetDate("")
      setColor(goal?.color || null)
    }
  }, [stage, goal, isOpen])

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please enter a title for the stage")
      return
    }

    if (!goal) {
      alert("No goal selected")
      return
    }

    setIsSaving(true)
    try {
      // Calculate order for new stages
      const existingStages = goal.stages || []
      const maxOrder = existingStages.length > 0 ? Math.max(...existingStages.map((s) => s.order)) : -1

      onSave({
        id: stage?.id,
        title,
        description: description || null,
        targetDate: targetDate ? new Date(targetDate).toISOString() : null,
        color: color || null,
        order: stage ? stage.order : maxOrder + 1,
        goalId: goal.id,
      })
      onClose()
    } catch (err) {
      console.error("Failed to save stage:", err)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !goal) return null

  const displayColor = color || goal.color || colors[5]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2" style={{ backgroundColor: `${displayColor}20` }}>
              <Flag className="h-5 w-5" style={{ color: displayColor }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{stage ? "Edit Stage" : "New Stage"}</h2>
              <p className="text-sm text-muted-foreground">for {goal.title}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What is this stage about?"
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this stage in detail..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Target Date (Optional)</Label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Color (Optional)</Label>
            <p className="text-sm text-muted-foreground">
              Leave empty to inherit from goal color
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setColor(null)}
                className={cn(
                  "w-8 h-8 rounded-full border-2 border-border transition-all flex items-center justify-center",
                  color === null && "ring-2 ring-offset-2 ring-offset-background ring-primary",
                )}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    color === c && "ring-2 ring-offset-2 ring-offset-background ring-primary",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between border-t border-border bg-card px-6 py-4">
          {stage && onDelete ? (
            <Button
              variant="ghost"
              className="text-red-400 hover:text-red-300"
              onClick={() => onDelete(stage)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Stage
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim() || isSaving}>
              {isSaving ? "Saving..." : stage ? "Save Changes" : "Create Stage"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
