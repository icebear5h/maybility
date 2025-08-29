"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, MessageSquare } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import type { Goal, GoalTask, GoalUpdate } from "@prisma/client"

type GoalWithDetails = Goal & {
  tasks: GoalTask[]
  updates: (GoalUpdate & { task?: { title: string } })[]
}

interface TasksTabProps {
  goal: GoalWithDetails
  onRefetch: () => void
}

export function TasksTab({ goal, onRefetch }: TasksTabProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskDue, setNewTaskDue] = useState("")
  const [newTaskMilestone, setNewTaskMilestone] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    setIsCreating(true)
    try {
      const response = await fetch(`/api/goals/${goal.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          isMilestone: newTaskMilestone,
          dueAt: newTaskDue || undefined,
        }),
      })

      if (!response.ok) throw new Error("Failed to create task")

      setNewTaskTitle("")
      setNewTaskDue("")
      setNewTaskMilestone(false)
      onRefetch()
      toast({
        title: "Task created",
        description: "Your task has been added to the goal.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleTask = async (task: GoalTask) => {
    const taskId = task.id
    if (updatingTasks.has(taskId)) return

    setUpdatingTasks((prev) => new Set(prev).add(taskId))
    try {
      const newStatus = task.status === "TODO" ? "DONE" : "TODO"
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error("Failed to update task")

      onRefetch()
      if (newStatus === "DONE") {
        toast({
          title: task.isMilestone ? "Milestone reached!" : "Task completed!",
          description: `${task.title} has been marked as complete.`,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUpdatingTasks((prev) => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  const todoTasks = goal.tasks.filter((task) => task.status === "TODO")
  const doneTasks = goal.tasks.filter((task) => task.status === "DONE")

  if (goal.tasks.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-muted-foreground">
          <p>No tasks yet.</p>
          <p className="text-sm mt-1">Add your first step toward this goal.</p>
        </div>

        <form onSubmit={handleCreateTask} className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-medium">Add First Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Task title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              required
            />
            <Input
              type="date"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
              placeholder="Due date (optional)"
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="milestone"
                checked={newTaskMilestone}
                onCheckedChange={(checked) => setNewTaskMilestone(checked as boolean)}
              />
              <label htmlFor="milestone" className="text-sm">
                Milestone
              </label>
            </div>
          </div>
          <Button type="submit" disabled={isCreating}>
            {isCreating ? "Creating..." : "Add Task"}
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add Task Form */}
      <form onSubmit={handleCreateTask} className="space-y-4 p-4 border rounded-lg">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <h3 className="font-medium">Add Task</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Task title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            required
          />
          <Input
            type="date"
            value={newTaskDue}
            onChange={(e) => setNewTaskDue(e.target.value)}
            placeholder="Due date (optional)"
          />
          <div className="flex items-center gap-2">
            <Checkbox
              id="milestone"
              checked={newTaskMilestone}
              onCheckedChange={(checked) => setNewTaskMilestone(checked as boolean)}
            />
            <label htmlFor="milestone" className="text-sm">
              Milestone
            </label>
          </div>
        </div>
        <Button type="submit" disabled={isCreating}>
          {isCreating ? "Creating..." : "Add Task"}
        </Button>
      </form>

      {/* Todo Tasks */}
      {todoTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">To Do</h3>
          {todoTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={() => handleToggleTask(task)}
              isUpdating={updatingTasks.has(task.id)}
            />
          ))}
        </div>
      )}

      {/* Done Tasks */}
      {doneTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">Completed</h3>
          {doneTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={() => handleToggleTask(task)}
              isUpdating={updatingTasks.has(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface TaskItemProps {
  task: GoalTask
  onToggle: () => void
  isUpdating: boolean
}

function TaskItem({ task, onToggle, isUpdating }: TaskItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <Checkbox checked={task.status === "DONE"} onCheckedChange={onToggle} disabled={isUpdating} />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className={task.status === "DONE" ? "line-through text-muted-foreground" : ""}>{task.title}</span>
          {task.isMilestone && <Badge variant="secondary">Milestone</Badge>}
        </div>
        {task.dueAt && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Due {formatDistanceToNow(new Date(task.dueAt), { addSuffix: true })}
          </div>
        )}
      </div>
      {task.status === "DONE" && (
        <Button variant="ghost" size="sm">
          <MessageSquare className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
