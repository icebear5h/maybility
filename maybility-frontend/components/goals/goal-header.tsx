"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ChevronDown, Calendar, BookOpen, Edit } from "lucide-react"
import Link from "next/link"
import type { Goal, GoalTask, GoalUpdate } from "@prisma/client"

type GoalWithDetails = Goal & {
  tasks: GoalTask[]
  updates: (GoalUpdate & { task?: { title: string } })[]
}

interface GoalHeaderProps {
  goal: GoalWithDetails
  onRefetch: () => void
}

export function GoalHeader({ goal, onRefetch }: GoalHeaderProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState(goal.color || "#3b82f6")
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    title: goal.title,
    description: goal.description || "",
    targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split("T")[0] : "",
    definitionOfDone: goal.definitionOfDone || "",
  })

  const completedTasks = goal.tasks.filter((task) => task.status === "DONE").length
  const totalTasks = goal.tasks.length
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const handleColorChange = async (color: string) => {
    setSelectedColor(color)
    try {
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ color }),
      })

      if (response.ok) {
        onRefetch()
      } else {
        console.error("[v0] Failed to update goal color")
        // Reset color on failure
        setSelectedColor(goal.color || "#3b82f6")
      }
    } catch (error) {
      console.error("[v0] Error updating goal color:", error)
      // Reset color on failure
      setSelectedColor(goal.color || "#3b82f6")
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Editing goal:", editForm)
    setEditDialogOpen(false)
    onRefetch()
  }

  return (
    <div className="space-y-4">
      {/* Main Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{goal.title}</h1>
          </div>

          {goal.description && <p className="text-muted-foreground text-lg">{goal.description}</p>}

          {/* Progress */}
          <div className="space-y-2 max-w-md">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span className="text-muted-foreground">
                {completedTasks}/{totalTasks} tasks
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Target Date */}
          {goal.targetDate && (
            <div className="text-sm text-muted-foreground">
              Target: {new Date(goal.targetDate).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
              title="Choose goal color"
            />
            <span className="text-sm text-gray-600">Color</span>
          </div>

          <Button variant="outline" size="sm" asChild>
            <Link href={`/calendar?goalId=${goal.id}`}>
              <Calendar className="h-4 w-4 mr-2" />
              Open in Calendar
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/journal?goalTag=${goal.id}`}>
              <BookOpen className="h-4 w-4 mr-2" />
              Goal Notes
            </Link>
          </Button>
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Goal</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Goal Title</Label>
                  <Input
                    id="title"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="bg-white text-black"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="bg-white text-black"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetDate">Target Date</Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={editForm.targetDate}
                    onChange={(e) => setEditForm({ ...editForm, targetDate: e.target.value })}
                    className="bg-white text-black"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="definitionOfDone">Definition of Done</Label>
                  <Textarea
                    id="definitionOfDone"
                    value={editForm.definitionOfDone}
                    onChange={(e) => setEditForm({ ...editForm, definitionOfDone: e.target.value })}
                    className="bg-white text-black"
                    rows={3}
                    placeholder="What does success look like for this goal?"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Collapsible Details */}
      {goal.definitionOfDone && (
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-auto">
              <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
              {detailsOpen ? "Hide details" : "Show details"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4 p-4 bg-muted/50 rounded-lg">
            {goal.definitionOfDone && (
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Definition of Done</h3>
                <p>{goal.definitionOfDone}</p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
