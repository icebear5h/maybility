"use client"

import type React from "react"

import { useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Plus, X, Check, GripVertical, Calendar, Clock } from "lucide-react"
import { format } from "date-fns"
import type { Task } from "@/types/task-types"

type TodoListProps = {
  todos: Task[]
  onAddTodo: (title: string) => void
  onToggleTodo: (id: string) => void
  onDeleteTodo: (id: string) => void
  onUpdateTodo: (id: string, updates: Partial<Task>) => void
}

function DraggableTodoItem({
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
      className={`todo-item ${todo.status === "DONE" ? "completed" : ""} ${isDragging ? "dragging" : ""}`}
    >
      <div className="todo-content">
        <button onClick={() => onToggle(todo.id)} className="todo-checkbox">
          {todo.status === "DONE" && <Check className="h-3 w-3" />}
        </button>

        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyPress}
            className="todo-edit-input"
            autoFocus
          />
        ) : (
          <span className="todo-title" onDoubleClick={() => setIsEditing(true)}>
            {todo.title}
          </span>
        )}

        {todo.dueDate && (
          <div className="todo-scheduled">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(todo.dueDate), "MMM d")}</span>
          </div>
        )}

        {todo.estimatedDuration && (
          <div className="todo-duration">
            <Clock className="h-3 w-3" />
            <span>{Math.round(todo.estimatedDuration / 60)}h</span>
          </div>
        )}
      </div>

      <div className="todo-actions">
        <div {...attributes} {...listeners} className="drag-handle">
          <GripVertical className="h-4 w-4" />
        </div>
        <button onClick={() => onDelete(todo.id)} className="delete-button">
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

export function TodoList({ todos, onAddTodo, onToggleTodo, onDeleteTodo, onUpdateTodo }: TodoListProps) {
  const [newTodoTitle, setNewTodoTitle] = useState("")
  const [showCompleted, setShowCompleted] = useState(false)

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

  const activeTodos = todos.filter((todo) => todo.status !== "DONE")
  const completedTodos = todos.filter((todo) => todo.status === "DONE")

  return (
    <div className="todo-list-container">
      <div className="todo-header">
        <div className="todo-title-section">
          <h3>Todo List</h3>
          <span className="todo-count">
            {activeTodos.length} active
            {completedTodos.length > 0 && `, ${completedTodos.length} completed`}
          </span>
        </div>

        <div className="todo-controls">
          {completedTodos.length > 0 && (
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="btn"
              style={{ fontSize: "12px", padding: "4px 8px" }}
            >
              {showCompleted ? "Hide" : "Show"} Completed
            </button>
          )}
        </div>
      </div>

      <div className="todo-add-section">
        <input
          type="text"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add a new task..."
          className="todo-input"
        />
        <button
          onClick={handleAddTodo}
          disabled={!newTodoTitle.trim()}
          className="btn btn-primary"
          style={{ fontSize: "13px", padding: "6px 12px" }}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </button>
      </div>

      <div className="todo-items">
        {activeTodos.map((todo) => (
          <DraggableTodoItem
            key={todo.id}
            todo={todo}
            onToggle={onToggleTodo}
            onDelete={onDeleteTodo}
            onUpdate={onUpdateTodo}
          />
        ))}

        {showCompleted && completedTodos.length > 0 && (
          <div className="completed-section">
            <div className="completed-header">
              <span>Completed Tasks</span>
            </div>
            {completedTodos.map((todo) => (
              <DraggableTodoItem
                key={todo.id}
                todo={todo}
                onToggle={onToggleTodo}
                onDelete={onDeleteTodo}
                onUpdate={onUpdateTodo}
              />
            ))}
          </div>
        )}

        {activeTodos.length === 0 && (
          <div className="empty-state">
            <Check className="h-8 w-8 text-gray-300 mb-2" />
            <p>All tasks completed! 🎉</p>
            <p className="text-sm">Add a new task to get started.</p>
          </div>
        )}
      </div>

      <div className="todo-hint">💡 Drag tasks to calendar days to schedule them</div>
    </div>
  )
}
