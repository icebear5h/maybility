"use client"

import { useState, useEffect } from "react"
import type { Goal, Stage } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { X, Plus, Trash2, Target, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

interface GoalEditorProps {
  goal: Goal | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Goal>) => void
  onDelete?: (goal: Goal) => void
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

export function GoalEditor({ goal, isOpen, onClose, onSave, onDelete }: GoalEditorProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [definitionOfDone, setDefinitionOfDone] = useState("")
  const [color, setColor] = useState(colors[0])
  const [targetDate, setTargetDate] = useState("")
  const [stages, setStages] = useState<Omit<Stage, "userId" | "goalId" | "createdAt" | "updatedAt">[]>([])
  const [newStageTitle, setNewStageTitle] = useState("")

  useEffect(() => {
    if (goal) {
      setTitle(goal.title)
      setDescription(goal.description || "")
      setDefinitionOfDone(goal.definitionOfDone || "")
      setColor(goal.color || colors[0])
      setTargetDate(goal.targetDate ? new Date(goal.targetDate).toISOString().split("T")[0] : "")
      setStages(goal.stages || [])
    } else {
      setTitle("")
      setDescription("")
      setDefinitionOfDone("")
      setColor(colors[0])
      setTargetDate("")
      setStages([])
    }
  }, [goal, isOpen])

  const handleAddStage = () => {
    if (!newStageTitle.trim()) return
    const maxOrder = stages.length > 0 ? Math.max(...stages.map((s) => s.order)) : -1
    const newStage = {
      id: `temp-${Date.now()}`,
      title: newStageTitle.trim(),
      description: null,
      targetDate: null,
      color: null,
      order: maxOrder + 1,
      entryPaths: null,
    }
    setStages([...stages, newStage])
    setNewStageTitle("")
  }

  const handleRemoveStage = (id: string) => {
    setStages(stages.filter((s) => s.id !== id))
  }

  const handleUpdateStageField = <K extends keyof Stage>(id: string, field: K, value: Stage[K]) => {
    setStages(stages.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }

  const handleReorderStages = (fromIndex: number, toIndex: number) => {
    const newStages = [...stages]
    const [removed] = newStages.splice(fromIndex, 1)
    newStages.splice(toIndex, 0, removed)

    // Recalculate order values
    const reorderedStages = newStages.map((stage, index) => ({
      ...stage,
      order: index,
    }))
    setStages(reorderedStages)
  }

  const handleSave = () => {
    onSave({
      id: goal?.id,
      title,
      description: description || null,
      definitionOfDone: definitionOfDone || null,
      color: color || null,
      targetDate: targetDate ? new Date(targetDate).toISOString() : null,
      stages: stages.map((s, i) => ({...s, order: i})),
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2" style={{ backgroundColor: `${color}20` }}>
              <Target className="h-5 w-5" style={{ color }} />
            </div>
            <h2 className="text-lg font-semibold">{goal ? "Edit Goal" : "New Goal"}</h2>
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
              placeholder="What do you want to achieve?"
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your goal in detail..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Definition of Done</Label>
            <Textarea
              value={definitionOfDone}
              onChange={(e) => setDefinitionOfDone(e.target.value)}
              placeholder="How will you know when this goal is complete?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
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

          <div className="space-y-2">
            <Label>Target Date (Optional)</Label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>

          <div className="space-y-3">
            <Label>Stages</Label>
            <p className="text-sm text-muted-foreground">
              Break down your goal into sequential stages. Each stage can have tasks and journal entries.
            </p>
            <div className="flex gap-2">
              <Input
                value={newStageTitle}
                onChange={(e) => setNewStageTitle(e.target.value)}
                placeholder="Add a stage..."
                onKeyDown={(e) => e.key === "Enter" && handleAddStage()}
              />
              <Button variant="outline" onClick={handleAddStage}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {stages.map((stage, index) => (
                <div key={stage.id} className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex items-center gap-2 pt-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div
                      className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${color}30`, color }}
                    >
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="font-medium">{stage.title}</div>
                    <Input
                      value={stage.description || ""}
                      onChange={(e) => handleUpdateStageField(stage.id, "description", e.target.value || null)}
                      placeholder="Stage description (optional)"
                      className="text-sm"
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveStage(stage.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-400" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between border-t border-border bg-card px-6 py-4">
          {goal && onDelete ? (
            <Button variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => onDelete(goal)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim()}>
              {goal ? "Save Changes" : "Create Goal"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
