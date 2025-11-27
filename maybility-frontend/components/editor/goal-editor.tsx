"use client"

import { useState, useEffect } from "react"
import type { Goal, Stage } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { X, Plus, Trash2, Target, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface GoalEditorProps {
  goal: Goal | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Goal>) => void
  onDelete?: (goal: Goal) => void
}

const categories = [
  { id: "career", label: "Career", color: "#6366f1" },
  { id: "health", label: "Health", color: "#22c55e" },
  { id: "financial", label: "Financial", color: "#eab308" },
  { id: "personal", label: "Personal", color: "#ec4899" },
  { id: "education", label: "Education", color: "#3b82f6" },
  { id: "relationships", label: "Relationships", color: "#f97316" },
] as const

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
  const [category, setCategory] = useState<Goal["category"]>("personal")
  const [color, setColor] = useState(colors[0])
  const [startDate, setStartDate] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [stages, setStages] = useState<Stage[]>([])
  const [newStageTitle, setNewStageTitle] = useState("")

  useEffect(() => {
    if (goal) {
      setTitle(goal.title)
      setDescription(goal.description || "")
      setCategory(goal.category)
      setColor(goal.color)
      setStartDate(new Date(goal.startDate).toISOString().split("T")[0])
      setTargetDate(new Date(goal.targetDate).toISOString().split("T")[0])
      setStages(goal.stages || [])
    } else {
      setTitle("")
      setDescription("")
      setCategory("personal")
      setColor(colors[0])
      setStartDate(new Date().toISOString().split("T")[0])
      setTargetDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      setStages([])
    }
  }, [goal, isOpen])

  const handleAddStage = () => {
    if (!newStageTitle.trim()) return
    const newStage: Stage = {
      id: `stage-${Date.now()}`,
      title: newStageTitle.trim(),
      order: stages.length,
      status: "pending",
    }
    setStages([...stages, newStage])
    setNewStageTitle("")
  }

  const handleRemoveStage = (id: string) => {
    setStages(stages.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i })))
  }

  const handleMoveStage = (index: number, direction: "up" | "down") => {
    const newStages = [...stages]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= stages.length) return
    ;[newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]]
    setStages(newStages.map((s, i) => ({ ...s, order: i })))
  }

  const handleUpdateStageDescription = (id: string, description: string) => {
    setStages(stages.map((s) => (s.id === id ? { ...s, description } : s)))
  }

  const handleSave = () => {
    onSave({
      id: goal?.id,
      title,
      description,
      category,
      color,
      startDate: new Date(startDate),
      targetDate: new Date(targetDate),
      stages,
      status: goal?.status || "not-started",
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
          {/* Title */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to achieve?"
              className="text-lg"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your goal in detail..."
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "rounded-lg border p-2 sm:p-3 text-center text-xs sm:text-sm transition-all",
                    category === cat.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
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

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Target Date</Label>
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Plan Stages</Label>
            <p className="text-sm text-muted-foreground">
              Break down your goal into stages. Each stage can have tasks and entries linked to it.
            </p>
            <div className="flex gap-2">
              <Input
                value={newStageTitle}
                onChange={(e) => setNewStageTitle(e.target.value)}
                placeholder="Add a stage (e.g., Research, Planning, Execution...)"
                onKeyDown={(e) => e.key === "Enter" && handleAddStage()}
              />
              <Button variant="outline" onClick={handleAddStage}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {stages.map((stage, index) => (
                <div key={stage.id} className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex flex-col gap-1 pt-1">
                    <button
                      onClick={() => handleMoveStage(index, "up")}
                      disabled={index === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleMoveStage(index, "down")}
                      disabled={index === stages.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div
                    className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mt-1"
                    style={{ backgroundColor: `${color}30`, color }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="font-medium">{stage.title}</div>
                    <Input
                      value={stage.description || ""}
                      onChange={(e) => handleUpdateStageDescription(stage.id, e.target.value)}
                      placeholder="What needs to happen in this stage?"
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
