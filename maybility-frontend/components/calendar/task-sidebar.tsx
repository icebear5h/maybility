"use client"

import type React from "react"
import { useState, useRef } from "react"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Plus, X, Check, GripVertical, Calendar, Clock, ChevronDown, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import type { Task } from "@//types/task-types"

type TaskSidebarProps = {
  tasks: Task[]
  onAddTask: (title: string) => void
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onUpdateTask: (id: string, updates: Partial<Task>) => void
}

function DraggableTaskItem({
  task,
  onToggle,
  onDelete,
  onUpdate,
}: {
  task: Task
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Task>) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: {
      type: "task",
      task: task,
    },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : 1,
    opacity: isDragging ? 0.8 : 1,
  }

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onUpdate(task.id, { title: editTitle.trim() })
    }
    setIsEditing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit()
    } else if (e.key === "Escape") {
      setEditTitle(task.title)
      setIsEditing(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-item ${task.status === "DONE" ? "completed" : ""} ${isDragging ? "dragging" : ""}`}
    >
      <div className="task-content">
        <button onClick={() => onToggle(task.id)} className="task-checkbox">
          {task.status === "DONE" && <Check className="h-3 w-3" />}
        </button>

        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyPress}
            className="task-edit-input"
            autoFocus
          />
        ) : (
          <div className="task-text" onDoubleClick={() => setIsEditing(true)}>
            <span className="task-title">{task.title}</span>
            <div className="task-meta">
              {task.scheduledDate && (
                <div className="task-scheduled">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(task.scheduledDate), "MMM d")}</span>
                </div>
              )}
              {task.estimatedDuration && (
                <div className="task-duration">
                  <Clock className="h-3 w-3" />
                  <span>{Math.round(task.estimatedDuration / 60)}h</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="task-actions">
        <div {...attributes} {...listeners} className="drag-handle">
          <GripVertical className="h-3 w-3" />
        </div>
        <button onClick={() => onDelete(task.id)} className="delete-button">
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

export function TaskSidebar({ tasks, onAddTask, onToggleTask, onDeleteTask, onUpdateTask }: TaskSidebarProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [showCompleted, setShowCompleted] = useState(false)
  const [showScheduled, setShowScheduled] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleAddTask = () => {
    const value = newTaskTitle.trim()
    if (!value) {
      inputRef.current?.focus()
      return
    }
    onAddTask(value)
    setNewTaskTitle("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddTask()
    }
  }

  // Filter tasks into different categories
  const unscheduledTasks = tasks.filter((task) => task.status !== "DONE" && !task.scheduledDate)
  const scheduledTasks = tasks.filter((task) => task.status !== "DONE" && task.scheduledDate)
  const completedTasks = tasks.filter((task) => task.status === "DONE")

  if (isCollapsed) {
    return (
      <div className="task-sidebar collapsed">
        <button onClick={() => setIsCollapsed(false)} className="expand-button">
          <ChevronRight className="h-4 w-4" />
          <span>Tasks ({unscheduledTasks.length})</span>
        </button>
      </div>
    )
  }

  return (
    <div className="task-sidebar">
      <div className="task-sidebar-header">
        <div className="task-title-section">
          <button onClick={() => setIsCollapsed(true)} className="collapse-button">
            <ChevronDown className="h-4 w-4" />
          </button>
          <div>
            <h3>Tasks</h3>
            <span className="task-count">
              {unscheduledTasks.length} unscheduled
              {scheduledTasks.length > 0 && `, ${scheduledTasks.length} scheduled`}
              {completedTasks.length > 0 && `, ${completedTasks.length} completed`}
            </span>
          </div>
        </div>
      </div>

      <div className="task-add-section">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add task..."
          className="task-input"
          ref={inputRef}
        />
        <button onClick={handleAddTask} className="add-task-button" title={newTaskTitle.trim() ? "Add task" : "Add empty task (focus input)"}>
          <Plus className="h-3 w-3" />
        </button>
      </div>

      <div className="task-items">
        {/* Unscheduled Tasks */}
        {unscheduledTasks.map((task) => (
          <DraggableTaskItem
            key={task.id}
            task={task}
            onToggle={onToggleTask}
            onDelete={onDeleteTask}
            onUpdate={onUpdateTask}
          />
        ))}

        {unscheduledTasks.length === 0 && scheduledTasks.length === 0 && completedTasks.length === 0 && (
          <div className="empty-state">
            <Check className="h-6 w-6 text-gray-300 mb-2" />
            <p>No tasks yet</p>
            <p className="text-sm">Add a task to get started</p>
          </div>
        )}

        {unscheduledTasks.length === 0 && (scheduledTasks.length > 0 || completedTasks.length > 0) && (
          <div className="empty-state">
            <Check className="h-6 w-6 text-gray-300 mb-2" />
            <p>All tasks scheduled! 🎉</p>
            <p className="text-sm">Add more tasks or check your calendar</p>
          </div>
        )}

        {/* Scheduled Tasks Section */}
        {scheduledTasks.length > 0 && (
          <div className="scheduled-section">
            <button onClick={() => setShowScheduled(!showScheduled)} className="section-toggle">
              {showScheduled ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span>Scheduled ({scheduledTasks.length})</span>
            </button>

            {showScheduled && (
              <div className="scheduled-tasks">
                {scheduledTasks.map((task) => (
                  <DraggableTaskItem
                    key={task.id}
                    task={task}
                    onToggle={onToggleTask}
                    onDelete={onDeleteTask}
                    onUpdate={onUpdateTask}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed Tasks Section */}
        {completedTasks.length > 0 && (
          <div className="completed-section">
            <button onClick={() => setShowCompleted(!showCompleted)} className="section-toggle">
              {showCompleted ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span>Completed ({completedTasks.length})</span>
            </button>

            {showCompleted && (
              <div className="completed-tasks">
                {completedTasks.map((task) => (
                  <DraggableTaskItem
                    key={task.id}
                    task={task}
                    onToggle={onToggleTask}
                    onDelete={onDeleteTask}
                    onUpdate={onUpdateTask}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="task-hint">💡 Drag tasks to calendar</div>
    </div>
  )
}
