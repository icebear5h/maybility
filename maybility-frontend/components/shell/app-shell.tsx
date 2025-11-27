"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { ViewMode, JournalEntry, Folder, Task, Goal } from "@/lib/types"
import { NavigationBar } from "./navigation-bar"
import { JournalView } from "../journal/journal-view"
import { TimeView } from "../time/time-view"
import { GoalsView } from "../goals/goals-view"
import { AiChatSidebar } from "../sidebar/ai-chat-sidebar"
import { EntryDetailPanel } from "../editor/entry-detail-panel"
import { EntryEditor } from "../editor/entry-editor"
import { EventEditor } from "../editor/event-editor"
import { GoalEditor } from "../editor/goal-editor"
import { TodoSidebar } from "../sidebar/todo-sidebar"

interface AppShellProps {
  entries: JournalEntry[]
  folders: Folder[]
  goals?: Goal[]
}

const mockTasks: Task[] = [
  {
    id: "task-1",
    title: "Review weekly goals",
    completed: false,
    priority: "high",
    createdAt: new Date(),
    goalId: "goal-1",
  },
  { id: "task-2", title: "Write morning reflection", completed: false, priority: "medium", createdAt: new Date() },
  { id: "task-3", title: "Plan next week", completed: false, priority: "low", createdAt: new Date(), goalId: "goal-1" },
  { id: "task-4", title: "Meditation session", completed: true, createdAt: new Date(), goalId: "goal-2" },
]

const mockGoals: Goal[] = [
  {
    id: "goal-1",
    title: "Learn a New Programming Language",
    description: "Master TypeScript and build 3 production-ready projects",
    color: "#6366f1",
    status: "in-progress",
    progress: 45,
    startDate: new Date("2025-01-01"),
    targetDate: new Date("2025-12-31"),
    category: "education",
    milestones: [
      {
        id: "m1",
        title: "Complete TypeScript basics course",
        targetDate: new Date("2025-03-01"),
        completed: true,
        completedAt: new Date("2025-02-15"),
      },
      { id: "m2", title: "Build first project", targetDate: new Date("2025-06-01"), completed: false },
      { id: "m3", title: "Contribute to open source", targetDate: new Date("2025-09-01"), completed: false },
    ],
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date(),
  },
  {
    id: "goal-2",
    title: "Improve Physical Fitness",
    description: "Run a half marathon and maintain a consistent workout routine",
    color: "#22c55e",
    status: "in-progress",
    progress: 30,
    startDate: new Date("2025-01-01"),
    targetDate: new Date("2025-11-01"),
    category: "health",
    milestones: [
      { id: "m4", title: "Run 5K without stopping", targetDate: new Date("2025-03-01"), completed: true },
      { id: "m5", title: "Run 10K", targetDate: new Date("2025-06-01"), completed: false },
      { id: "m6", title: "Complete half marathon", targetDate: new Date("2025-11-01"), completed: false },
    ],
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date(),
  },
  {
    id: "goal-3",
    title: "Build Emergency Fund",
    description: "Save 6 months of living expenses",
    color: "#eab308",
    status: "in-progress",
    progress: 60,
    startDate: new Date("2024-06-01"),
    targetDate: new Date("2026-06-01"),
    category: "financial",
    milestones: [
      { id: "m7", title: "Save 1 month expenses", targetDate: new Date("2024-09-01"), completed: true },
      { id: "m8", title: "Save 3 months expenses", targetDate: new Date("2025-03-01"), completed: true },
      { id: "m9", title: "Save 6 months expenses", targetDate: new Date("2026-06-01"), completed: false },
    ],
    createdAt: new Date("2024-06-01"),
    updatedAt: new Date(),
  },
]

export function AppShell({ entries: initialEntries, folders: initialFolders, goals: initialGoals }: AppShellProps) {
  const [currentView, setCurrentView] = useState<ViewMode>("journal")
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [newEntryDate, setNewEntryDate] = useState<Date | undefined>(undefined)

  const [isEventEditorOpen, setIsEventEditorOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<JournalEntry | null>(null)
  const [newEventDate, setNewEventDate] = useState<Date | undefined>(undefined)

  const [isGoalEditorOpen, setIsGoalEditorOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  const [entries, setEntries] = useState<JournalEntry[]>(initialEntries)
  const [folders, setFolders] = useState<Folder[]>(initialFolders)

  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [goals, setGoals] = useState<Goal[]>(initialGoals || mockGoals)

  const [isDraggingTask, setIsDraggingTask] = useState(false)
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)

  const handleCreateEntry = (date?: Date) => {
    setEditingEntry(null)
    setNewEntryDate(date)
    setIsEditorOpen(true)
  }

  const handleCreateEvent = (date?: Date) => {
    setEditingEvent(null)
    setNewEventDate(date)
    setIsEventEditorOpen(true)
  }

  const handleCreateGoal = () => {
    setEditingGoal(null)
    setIsGoalEditorOpen(true)
  }

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setIsGoalEditorOpen(true)
  }

  const handleSaveGoal = (data: Partial<Goal>) => {
    if (data.id) {
      setGoals((prev) => prev.map((g) => (g.id === data.id ? { ...g, ...data, updatedAt: new Date() } : g)))
    } else {
      const newGoal: Goal = {
        id: `goal-${Date.now()}`,
        title: data.title || "Untitled Goal",
        description: data.description,
        color: data.color || "#6366f1",
        status: "not-started",
        progress: 0,
        startDate: data.startDate || new Date(),
        targetDate: data.targetDate || new Date(),
        category: data.category || "personal",
        milestones: data.milestones || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setGoals((prev) => [newGoal, ...prev])
    }
  }

  const handleDeleteGoal = (goal: Goal) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      setGoals((prev) => prev.filter((g) => g.id !== goal.id))
      setIsGoalEditorOpen(false)
    }
  }

  const handleUpdateGoal = (goal: Goal) => {
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...goal, updatedAt: new Date() } : g)))
  }

  const handleEditEntry = (entry: JournalEntry) => {
    if (entry.endTime || entry.isAllDay) {
      setEditingEvent(entry)
      setNewEventDate(undefined)
      setIsEventEditorOpen(true)
    } else {
      setEditingEntry(entry)
      setNewEntryDate(undefined)
      setIsEditorOpen(true)
    }
  }

  const handleSaveEntry = (data: Partial<JournalEntry>) => {
    if (data.id) {
      setEntries((prev) => prev.map((e) => (e.id === data.id ? { ...e, ...data, updatedAt: new Date() } : e)))
    } else {
      const newEntry: JournalEntry = {
        id: `entry-${Date.now()}`,
        title: data.title || "Untitled",
        content: data.content || "",
        createdAt: data.createdAt || new Date(),
        updatedAt: new Date(),
        userId: "user-1",
        mood: data.mood ?? null,
        energy: data.energy ?? null,
        clarity: data.clarity ?? null,
      }
      setEntries((prev) => [newEntry, ...prev])
    }
  }

  const handleSaveEvent = (data: Partial<JournalEntry>) => {
    if (data.id) {
      setEntries((prev) => prev.map((e) => (e.id === data.id ? { ...e, ...data, updatedAt: new Date() } : e)))
    } else {
      const newEntry: JournalEntry = {
        id: `entry-${Date.now()}`,
        title: data.title || "Untitled Event",
        content: data.content || "",
        createdAt: data.createdAt || new Date(),
        updatedAt: new Date(),
        userId: "user-1",
        mood: null,
        energy: null,
        clarity: null,
        endTime: data.endTime,
        isAllDay: data.isAllDay,
        color: data.color,
        recurrence: data.recurrence,
      }
      setEntries((prev) => [newEntry, ...prev])
    }
  }

  const handleDeleteEntry = (entry: JournalEntry) => {
    setEntries((prev) => prev.filter((e) => e.id !== entry.id))
    setSelectedEntry(null)
  }

  const handleCreateFolder = (parentId: string | null) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: "New Folder",
      parentId,
    }
    setFolders((prev) => [...prev, newFolder])
  }

  const handleDeleteFolder = (folder: Folder) => {
    setFolders((prev) => prev.filter((f) => f.id !== folder.id))
  }

  const handleRenameFolder = (folder: Folder) => {
    const newName = prompt("Enter new folder name:", folder.name)
    if (newName) {
      setFolders((prev) => prev.map((f) => (f.id === folder.id ? { ...f, name: newName } : f)))
    }
  }

  const handleTaskDragStart = (task: Task) => {
    setIsDraggingTask(true)
    setDraggingTask(task)
  }

  const handleTaskDragEnd = () => {
    setIsDraggingTask(false)
    setDraggingTask(null)
  }

  const handleTaskDrop = (task: Task, date: Date) => {
    const newEntry: JournalEntry = {
      id: `entry-${Date.now()}`,
      title: task.title,
      content: task.description || "",
      createdAt: date,
      updatedAt: new Date(),
      userId: "user-1",
      mood: null,
      energy: null,
      clarity: null,
      goalId: task.goalId,
    }
    setEntries((prev) => [newEntry, ...prev])
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: true, dueDate: date } : t)))
    setIsDraggingTask(false)
    setDraggingTask(null)
  }

  const handleUpdateEntry = (updatedEntry: JournalEntry) => {
    setEntries((prev) => prev.map((e) => (e.id === updatedEntry.id ? { ...updatedEntry, updatedAt: new Date() } : e)))
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <TodoSidebar
        tasks={tasks}
        onTasksChange={setTasks}
        onDragStart={handleTaskDragStart}
        onDragEnd={handleTaskDragEnd}
      />

      <div className="flex flex-1 flex-col">
        <NavigationBar
          currentView={currentView}
          onViewChange={setCurrentView}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
          isChatOpen={isChatOpen}
          onNewEntry={() => handleCreateEntry()}
        />

        <main className="relative flex-1 overflow-hidden">
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-300",
              currentView === "journal" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
            )}
          >
            <JournalView
              entries={entries}
              folders={folders}
              onSelectEntry={setSelectedEntry}
              selectedEntry={selectedEntry}
              onCreateEntry={() => handleCreateEntry()}
              onCreateFolder={handleCreateFolder}
              onDeleteEntry={handleDeleteEntry}
              onDeleteFolder={handleDeleteFolder}
              onRenameFolder={handleRenameFolder}
            />
          </div>

          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-300",
              currentView === "time" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
            )}
          >
            <TimeView
              entries={entries}
              onSelectEntry={setSelectedEntry}
              onCreateEntry={handleCreateEvent}
              isDraggingTask={isDraggingTask}
              onTaskDrop={handleTaskDrop}
              onUpdateEntry={handleUpdateEntry}
              goals={goals}
            />
          </div>

          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-300",
              currentView === "goals" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
            )}
          >
            <GoalsView
              goals={goals}
              tasks={tasks}
              entries={entries}
              onCreateGoal={handleCreateGoal}
              onEditGoal={handleEditGoal}
              onDeleteGoal={handleDeleteGoal}
              onUpdateGoal={handleUpdateGoal}
            />
          </div>
        </main>
      </div>

      <EntryDetailPanel
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onEdit={handleEditEntry}
        onDelete={handleDeleteEntry}
      />

      <EntryEditor
        entry={editingEntry}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveEntry}
        onDelete={handleDeleteEntry}
        initialDate={newEntryDate}
      />

      <EventEditor
        entry={editingEvent}
        isOpen={isEventEditorOpen}
        onClose={() => setIsEventEditorOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEntry}
        initialDate={newEventDate}
      />

      <GoalEditor
        goal={editingGoal}
        isOpen={isGoalEditorOpen}
        onClose={() => setIsGoalEditorOpen(false)}
        onSave={handleSaveGoal}
        onDelete={handleDeleteGoal}
      />

      <AiChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} selectedEntry={selectedEntry} />
    </div>
  )
}
