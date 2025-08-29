"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Calendar, MessageSquare, Clock, CheckCircle, StickyNote } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import type { Goal } from "@prisma/client"

type TaskWithDetails = {
  id: string
  title: string
  status: "TODO" | "IN_PROGRESS" | "DONE"
  dueDate: Date | null
  scheduledDate: Date | null
  startTime: string | null
  endTime: string | null
  isMilestone: boolean
  priority: "LOW" | "MEDIUM" | "HIGH"
  color: "BLUE" | "GREEN" | "RED" | "PURPLE"
  estimatedDuration: number | null
}

type UpdateWithDetails = {
  id: string
  kind: string
  body: string
  createdAt: Date
  task?: { title: string }
}

type GoalWithDetails = Goal & {
  tasks: TaskWithDetails[]
  updates: UpdateWithDetails[]
}

interface KanbanBoardProps {
  goal: GoalWithDetails
  onRefetch: () => void
}

export function KanbanBoard({ goal, onRefetch }: KanbanBoardProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskDue, setNewTaskDue] = useState("")
  const [newTaskMilestone, setNewTaskMilestone] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())
  const [timeFilter, setTimeFilter] = useState<"day" | "week" | "month" | "year" | "all">("all")
  const { toast } = useToast()

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    setIsCreating(true)
    try {
      // Mock task creation - in real app would call API
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

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    setIsCreatingNote(true)
    try {
      // Mock note creation - in real app would call API
      setNewNote("")
      onRefetch()
      toast({
        title: "Note added",
        description: "Your reflection has been saved.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingNote(false)
    }
  }

  const handleToggleTask = async (task: TaskWithDetails) => {
    const taskId = task.id
    if (updatingTasks.has(taskId)) return

    setUpdatingTasks((prev) => new Set(prev).add(taskId))
    try {
      // Mock task toggle - in real app would call API
      onRefetch()
      const newStatus = task.status === "TODO" ? "DONE" : "TODO"
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

  const getFilteredTasks = (tasks: TaskWithDetails[]) => {
    if (timeFilter === "all") return tasks

    const now = new Date()
    const filterDate = new Date()

    switch (timeFilter) {
      case "day":
        filterDate.setDate(now.getDate() + 1)
        break
      case "week":
        filterDate.setDate(now.getDate() + 7)
        break
      case "month":
        filterDate.setMonth(now.getMonth() + 1)
        break
      case "year":
        filterDate.setFullYear(now.getFullYear() + 1)
        break
    }

    return tasks.filter((task) => {
      if (!task.dueDate) return timeFilter === "all"
      const dueDate = new Date(task.dueDate)
      return dueDate >= now && dueDate <= filterDate
    })
  }

  const allTodoTasks = goal.tasks?.filter((task) => task.status === "TODO") || []
  const todoTasks = getFilteredTasks(allTodoTasks)
  const doneTasks = goal.tasks?.filter((task) => task.status === "DONE") || []
  const updates = goal.updates || []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-4 bg-white border rounded-lg">
        <span className="text-sm font-medium text-black">Filter tasks:</span>
        <div className="flex gap-1">
          {[
            { key: "all", label: "All" },
            { key: "day", label: "Today" },
            { key: "week", label: "This Week" },
            { key: "month", label: "This Month" },
            { key: "year", label: "This Year" },
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={timeFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter(key as typeof timeFilter)}
              className="text-xs"
            >
              {label}
            </Button>
          ))}
        </div>
        {timeFilter !== "all" && (
          <span className="text-xs text-black ml-2">
            Showing {todoTasks.length} of {allTodoTasks.length} tasks
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-350px)]">
        {/* History Column */}
        <Card className="flex flex-col bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-black">
              <CheckCircle className="h-5 w-5 text-black" />
              History
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-3">
            {doneTasks.length === 0 ? (
              <div className="text-center py-8 text-black">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No completed tasks yet</p>
              </div>
            ) : (
              doneTasks.map((task) => (
                <div key={task.id} className="p-3 border rounded-lg bg-white border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Checkbox checked={true} disabled />
                    <span className="line-through text-black text-sm">{task.title}</span>
                    {task.isMilestone && (
                      <Badge variant="secondary" className="text-xs">
                        Milestone
                      </Badge>
                    )}
                  </div>
                  {task.scheduledDate && task.startTime && (
                    <div className="flex items-center gap-1 text-xs text-black">
                      <Clock className="h-3 w-3" />
                      Scheduled: {task.startTime} - {task.endTime}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Todo Column */}
        <Card className="flex flex-col bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-black">
              <Clock className="h-5 w-5 text-black" />
              Todo
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-3">
            {/* Add Task Form */}
            <form onSubmit={handleCreateTask} className="space-y-3 p-3 border rounded-lg bg-white border-gray-200">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-black" />
                <span className="text-sm font-medium text-black">Add Task</span>
              </div>
              <Input
                placeholder="Task title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                required
                className="text-sm bg-white text-black border-gray-300"
              />
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newTaskDue}
                  onChange={(e) => setNewTaskDue(e.target.value)}
                  className="text-sm bg-white text-black border-gray-300"
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="milestone"
                    checked={newTaskMilestone}
                    onCheckedChange={(checked) => setNewTaskMilestone(checked as boolean)}
                  />
                  <label htmlFor="milestone" className="text-xs text-black">
                    Milestone
                  </label>
                </div>
              </div>
              <Button type="submit" disabled={isCreating} size="sm" className="w-full">
                {isCreating ? "Creating..." : "Add Task"}
              </Button>
            </form>

            {/* Todo Tasks */}
            {todoTasks.length === 0 ? (
              <div className="text-center py-8 text-black">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending tasks</p>
              </div>
            ) : (
              todoTasks.map((task) => (
                <div key={task.id} className="p-3 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => handleToggleTask(task)}
                      disabled={updatingTasks.has(task.id)}
                    />
                    <span className="text-sm text-black">{task.title}</span>
                    {task.isMilestone && (
                      <Badge variant="secondary" className="text-xs">
                        Milestone
                      </Badge>
                    )}
                  </div>
                  {task.dueDate && (
                    <div className="flex items-center gap-1 text-xs text-black">
                      <Calendar className="h-3 w-3" />
                      Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                    </div>
                  )}
                  {task.scheduledDate && task.startTime && (
                    <div className="flex items-center gap-1 text-xs text-black">
                      <Clock className="h-3 w-3" />
                      Scheduled: {task.startTime} - {task.endTime}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Notes Column */}
        <Card className="flex flex-col bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-black">
              <StickyNote className="h-5 w-5 text-black" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-3">
            {/* Add Note Form */}
            <form onSubmit={handleCreateNote} className="space-y-3 p-3 border rounded-lg bg-white border-gray-200">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-black" />
                <span className="text-sm font-medium text-black">Add Note</span>
              </div>
              <Textarea
                placeholder="Write a reflection or note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                required
                className="text-sm min-h-[80px] bg-white text-black border-gray-300"
              />
              <Button type="submit" disabled={isCreatingNote} size="sm" className="w-full">
                {isCreatingNote ? "Adding..." : "Add Note"}
              </Button>
            </form>

            {/* Updates/Notes */}
            {updates.length === 0 ? (
              <div className="text-center py-8 text-black">
                <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notes yet</p>
              </div>
            ) : (
              updates.map((update) => (
                <div key={update.id} className="p-2 border rounded-lg bg-white border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {update.kind === "REFLECTION"
                        ? "Reflection"
                        : update.kind === "MILESTONE"
                          ? "Milestone"
                          : "Progress"}
                    </Badge>
                    <span className="text-xs text-black">
                      {formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-black">{update.body}</p>
                  {update.task && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-black">
                      <MessageSquare className="h-3 w-3" />
                      Related to: {update.task.title}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
