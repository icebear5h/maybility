"use client"

import type React from "react"

import { useState } from "react"
import type { Task } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  CheckCircle2,
  Circle,
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  ListTodo,
} from "lucide-react"

interface TodoSidebarProps {
  tasks: Task[]
  onTasksChange: (tasks: Task[]) => void
  onDragStart: (task: Task) => void
  onDragEnd: () => void
}

export function TodoSidebar({ tasks, onTasksChange, onDragStart, onDragEnd }: TodoSidebarProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [showCompleted, setShowCompleted] = useState(false)
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  const incompleteTasks = tasks.filter((t) => t.taskStatus !== 'DONE')
  const completedTasks = tasks.filter((t) => t.taskStatus === 'DONE')

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || isCreating) return

    setIsCreating(true)
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          taskStatus: 'TODO',
          priority: 'MEDIUM',
          color: '#3b82f6',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      const newTask: Task = await response.json()
      onTasksChange([newTask, ...tasks])
      setNewTaskTitle("")
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleComplete = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    const newStatus = task.taskStatus === 'DONE' ? 'TODO' : 'DONE'
    const completedAt = newStatus === 'DONE' ? new Date().toISOString() : null

    // Optimistic update
    onTasksChange(
      tasks.map((t) =>
        t.id === taskId
          ? { ...t, taskStatus: newStatus, completedAt }
          : t
      )
    )

    try {
      const response = await fetch(`/api/events/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskStatus: newStatus,
          completedAt,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      const updatedTask: Task = await response.json()
      onTasksChange(tasks.map((t) => (t.id === taskId ? updatedTask : t)))
    } catch (error) {
      console.error('Error updating task:', error)
      // Revert optimistic update
      onTasksChange(tasks.map((t) => (t.id === taskId ? task : t)))
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    // Optimistic delete
    const taskToDelete = tasks.find((t) => t.id === taskId)
    onTasksChange(tasks.filter((t) => t.id !== taskId))

    try {
      const response = await fetch(`/api/events/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      // Revert optimistic delete
      if (taskToDelete) {
        onTasksChange([...tasks])
      }
    }
  }

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData("application/json", JSON.stringify(task))
    e.dataTransfer.effectAllowed = "move"
    setDraggedTask(task.id)
    onDragStart(task)
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
    onDragEnd()
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toUpperCase()) {
      case "HIGH":
        return "text-red-400"
      case "MEDIUM":
        return "text-yellow-400"
      case "LOW":
        return "text-blue-400"
      default:
        return "text-muted-foreground"
    }
  }

  const renderTask = (task: Task) => {
    const isCompleted = task.taskStatus === 'DONE'

    return (
      <div
        key={task.id}
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        onDragEnd={handleDragEnd}
        className={cn(
          "group flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 p-2 transition-all",
          "hover:border-primary/30 hover:bg-card cursor-grab active:cursor-grabbing",
          draggedTask === task.id && "opacity-50 border-primary",
        )}
      >
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />

        <button onClick={() => handleToggleComplete(task.id)} className="shrink-0">
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className={cn("h-5 w-5", getPriorityColor(task.priority))} />
          )}
        </button>

        <span className={cn("flex-1 text-sm truncate", isCompleted && "line-through text-muted-foreground")}>
          {task.title}
        </span>

        <button
          onClick={() => handleDeleteTask(task.id)}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-400" />
        </button>
      </div>
    )
  }

  if (isCollapsed) {
    return (
      <div className="flex h-full w-12 flex-col items-center border-r border-border/50 bg-card/30 py-3 gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8"
          title="Expand sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>

        <div className="flex flex-col items-center gap-1 mt-2">
          <ListTodo className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">{incompleteTasks.length}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-border/50 bg-card/30">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <h2 className="text-sm font-semibold">Tasks</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{incompleteTasks.length} remaining</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-6 w-6"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Add a task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
            className="h-8 text-sm bg-muted/30 border-border/50"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleAddTask}
            disabled={!newTaskTitle.trim() || isCreating}
            className="h-8 w-8 shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Drag tasks onto calendar to schedule</p>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-2">
        {incompleteTasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No tasks yet</p>
          </div>
        ) : (
          incompleteTasks.map(renderTask)
        )}

        {completedTasks.length > 0 && (
          <div className="pt-4">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full"
            >
              {showCompleted ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Completed ({completedTasks.length})
            </button>

            {showCompleted && <div className="mt-2 space-y-2">{completedTasks.map(renderTask)}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
