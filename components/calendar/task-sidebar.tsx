"use client"

import type React from "react"

import { useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Plus, X, Check, GripVertical, Calendar, Clock, ChevronDown, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import type { Task } from "@/types/task-types"

type TaskSidebarProps = {
  todos: Task[]
  onAddTodo: (title: string) => void
  onToggleTodo: (id: string) => void
  onDeleteTodo: (id: string) => void
  onUpdateTodo: (id: string, updates: Partial<Task>) => void
}

function DraggableTaskItem({
  todo,
  onToggle,
  onDelete,
  onUpdate,
}: {
  todo: Task
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Task>) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(todo.title)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `todo-${todo.id}`,
    data: {
      type: "todo",
      todo: todo,
    },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : 1,
    opacity: isDragging ? 0.8 : 1,
  }

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onUpdate(todo.id, { title: editTitle.trim() })
    }
    setIsEditing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit()
    } else if (e.key === "Escape") {
      setEditTitle(todo.title)
      setIsEditing(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-item ${todo.status === "DONE" ? "completed" : ""} ${isDragging ? "dragging" : ""}`}
    >
      <div className="task-content">
        <button onClick={() => onToggle(todo.id)} className="task-checkbox">
          {todo.status === "DONE" && <Check className="h-3 w-3" />}
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
            <span className="task-title">{todo.title}</span>
            <div className="task-meta">
              {todo.scheduledDate && (
                <div className="task-scheduled">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(todo.scheduledDate), "MMM d")}</span>
                </div>
              )}
              {todo.estimatedDuration && (
                <div className="task-duration">
                  <Clock className="h-3 w-3" />
                  <span>{Math.round(todo.estimatedDuration / 60)}h</span>
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
        <button onClick={() => onDelete(todo.id)} className="delete-button">
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

export function TaskSidebar({ todos, onAddTodo, onToggleTodo, onDeleteTodo, onUpdateTodo }: TaskSidebarProps) {
  const [newTodoTitle, setNewTodoTitle] = useState("")
  const [showCompleted, setShowCompleted] = useState(false)
  const [showScheduled, setShowScheduled] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleAddTodo = () => {
    if (newTodoTitle.trim()) {
      onAddTodo(newTodoTitle.trim())
      setNewTodoTitle("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddTodo()
    }
  }

  // Filter todos into different categories
  const unscheduledTodos = todos.filter((todo) => todo.status !== "DONE" && !todo.scheduledDate)
  const scheduledTodos = todos.filter((todo) => todo.status !== "DONE" && todo.scheduledDate)
  const completedTodos = todos.filter((todo) => todo.status === "DONE")

  if (isCollapsed) {
    return (
      <div className="task-sidebar collapsed">
        <button onClick={() => setIsCollapsed(false)} className="expand-button">
          <ChevronRight className="h-4 w-4" />
          <span>Tasks ({unscheduledTodos.length})</span>
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
              {unscheduledTodos.length} unscheduled
              {scheduledTodos.length > 0 && `, ${scheduledTodos.length} scheduled`}
              {completedTodos.length > 0 && `, ${completedTodos.length} completed`}
            </span>
          </div>
        </div>
      </div>

      <div className="task-add-section">
        <input
          type="text"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add task..."
          className="task-input"
        />
        <button onClick={handleAddTodo} disabled={!newTodoTitle.trim()} className="add-task-button" title="Add task">
          <Plus className="h-3 w-3" />
        </button>
      </div>

      <div className="task-items">
        {/* Unscheduled Tasks */}
        {unscheduledTodos.map((todo) => (
          <DraggableTaskItem
            key={todo.id}
            todo={todo}
            onToggle={onToggleTodo}
            onDelete={onDeleteTodo}
            onUpdate={onUpdateTodo}
          />
        ))}

        {unscheduledTodos.length === 0 && scheduledTodos.length === 0 && completedTodos.length === 0 && (
          <div className="empty-state">
            <Check className="h-6 w-6 text-gray-300 mb-2" />
            <p>No tasks yet</p>
            <p className="text-sm">Add a task to get started</p>
          </div>
        )}

        {unscheduledTodos.length === 0 && (scheduledTodos.length > 0 || completedTodos.length > 0) && (
          <div className="empty-state">
            <Check className="h-6 w-6 text-gray-300 mb-2" />
            <p>All tasks scheduled! 🎉</p>
            <p className="text-sm">Add more tasks or check your calendar</p>
          </div>
        )}

        {/* Scheduled Tasks Section */}
        {scheduledTodos.length > 0 && (
          <div className="scheduled-section">
            <button onClick={() => setShowScheduled(!showScheduled)} className="section-toggle">
              {showScheduled ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span>Scheduled ({scheduledTodos.length})</span>
            </button>

            {showScheduled && (
              <div className="scheduled-tasks">
                {scheduledTodos.map((todo) => (
                  <DraggableTaskItem
                    key={todo.id}
                    todo={todo}
                    onToggle={onToggleTodo}
                    onDelete={onDeleteTodo}
                    onUpdate={onUpdateTodo}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed Tasks Section */}
        {completedTodos.length > 0 && (
          <div className="completed-section">
            <button onClick={() => setShowCompleted(!showCompleted)} className="section-toggle">
              {showCompleted ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span>Completed ({completedTodos.length})</span>
            </button>

            {showCompleted && (
              <div className="completed-tasks">
                {completedTodos.map((todo) => (
                  <DraggableTaskItem
                    key={todo.id}
                    todo={todo}
                    onToggle={onToggleTodo}
                    onDelete={onDeleteTodo}
                    onUpdate={onUpdateTodo}
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
