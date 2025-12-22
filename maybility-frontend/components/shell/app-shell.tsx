"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession, signIn } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { ViewMode, JournalEntry, Folder, Task, Goal, Stage } from "@/lib/types"
import { NavigationBar } from "./navigation-bar"
import { JournalView } from "../journal/journal-view"
import { TimeView } from "../time/time-view"
import { GoalsView } from "../goals/goals-view"
import { AiChatSidebar } from "../sidebar/ai-chat-sidebar"
import { EntryDetailPanel } from "../editor/entry-detail-panel"
import { EntryEditor } from "../editor/entry-editor"
import { EventEditor } from "../editor/event-editor"
import { GoalEditor } from "../editor/goal-editor"
import { StageEditor } from "../editor/stage-editor"
import { TodoSidebar } from "../sidebar/todo-sidebar"
import { CommandPalette } from "../navigation/command-palette"
import { FocusModeProvider, useFocusMode } from "../focus/focus-mode-provider"
import { FocusModeIndicator } from "../focus/focus-mode-indicator"
import { SettingsView } from "../settings/settings-view"

interface AppShellProps {
  entries?: JournalEntry[]
  folders?: Folder[]
  goals?: Goal[]
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Dimensional Journal</h1>
          <p className="text-muted-foreground">Sign in to access your workspace</p>
        </div>
        <Button onClick={() => signIn("google")} size="lg">
          Sign in with Google
        </Button>
      </div>
    )
  }

  return <>{children}</>
}

function AppShellContent({ entries: initialEntries = [], folders: initialFolders = [], goals: initialGoals = [] }: AppShellProps = {}) {
  const { focusLevel } = useFocusMode()

  const [currentView, setCurrentView] = useState<ViewMode>("journal")
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [newEntryDate, setNewEntryDate] = useState<Date | undefined>(undefined)

  const [isEventEditorOpen, setIsEventEditorOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<any>(null)
  const [newEventDate, setNewEventDate] = useState<Date | undefined>(undefined)

  const [isGoalEditorOpen, setIsGoalEditorOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  const [isStageEditorOpen, setIsStageEditorOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<Stage | null>(null)
  const [stageGoal, setStageGoal] = useState<Goal | null>(null)

  const [prefillGoalId, setPrefillGoalId] = useState<string | undefined>(undefined)
  const [prefillStageId, setPrefillStageId] = useState<string | undefined>(undefined)

  const [entries, setEntries] = useState<JournalEntry[]>(initialEntries)
  const [folders, setFolders] = useState<Folder[]>(initialFolders)

  const [tasks, setTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<Goal[]>(initialGoals || [])
  const [events, setEvents] = useState<any[]>([])

  const [isDraggingTask, setIsDraggingTask] = useState(false)
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  // Cmd+K / Ctrl+K to open command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Fetch goals and all events (both tasks and scheduled events)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [goalsRes, allEventsRes] = await Promise.all([
          fetch('/api/goals'),
          fetch('/api/events') // Fetch all events
        ])

        if (goalsRes.ok) {
          const goalsData = await goalsRes.json()
          setGoals(goalsData)
        }

        if (allEventsRes.ok) {
          const allEvents = await allEventsRes.json()
          // Separate tasks and events for backward compatibility
          setTasks(allEvents.filter((e: any) => e.taskStatus))
          setEvents(allEvents)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [])

  const handleCreateEntry = (date?: Date) => {
    setEditingEntry(null)
    setNewEntryDate(date)
    setIsEditorOpen(true)
  }

  const [editorMode, setEditorMode] = useState<'event' | 'task'>('event')

  const handleCreateEvent = (date?: Date, goalId?: string, stageId?: string) => {
    setEditingEvent(null)
    setNewEventDate(date)
    setPrefillGoalId(goalId)
    setPrefillStageId(stageId)
    setEditorMode('event')
    setIsEventEditorOpen(true)
  }

  const handleCreateTask = (goalId?: string, stageId?: string) => {
    setEditingEvent(null)
    setNewEventDate(undefined)
    setPrefillGoalId(goalId)
    setPrefillStageId(stageId)
    setEditorMode('task')
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

  const handleSaveGoal = async (data: Partial<Goal>) => {
    try {
      if (data.id) {
        // Update existing goal
        const res = await fetch(`/api/goals/${data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (res.ok) {
          const updatedGoal = await res.json()
          setGoals((prev) => prev.map((g) => (g.id === data.id ? updatedGoal : g)))
        }
      } else {
        // Create new goal
        const res = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.title || "Untitled Goal",
            description: data.description,
            color: data.color || "#6366f1",
            targetDate: data.targetDate ? (typeof data.targetDate === 'string' ? data.targetDate : data.targetDate.toISOString()) : null,
            definitionOfDone: '', // Prisma field, not in frontend type yet
          }),
        })

        if (res.ok) {
          const newGoal = await res.json()
          setGoals((prev) => [newGoal, ...prev])
        }
      }
    } catch (error) {
      console.error('Error saving goal:', error)
    }
  }

  const handleDeleteGoal = async (goal: Goal) => {
    if (!confirm("Are you sure you want to delete this goal?")) return

    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setGoals((prev) => prev.filter((g) => g.id !== goal.id))
        setIsGoalEditorOpen(false)
      }
    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  const handleUpdateGoal = (goal: Goal) => {
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...goal, updatedAt: new Date() } : g)))
  }

  const handleArchiveGoal = async (goal: Goal) => {
    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !goal.archived }),
      })

      if (res.ok) {
        const updatedGoal = await res.json()
        setGoals((prev) => prev.map((g) => (g.id === goal.id ? updatedGoal : g)))
      }
    } catch (error) {
      console.error('Error archiving goal:', error)
    }
  }

  const handleCreateStage = (goal: Goal) => {
    setEditingStage(null)
    setStageGoal(goal)
    setIsStageEditorOpen(true)
  }

  const handleEditStage = (stage: Stage, goal: Goal) => {
    setEditingStage(stage)
    setStageGoal(goal)
    setIsStageEditorOpen(true)
  }

  const handleSaveStage = async (data: Partial<Stage>) => {
    if (!stageGoal) return

    try {
      if (data.id && !data.id.startsWith('temp-')) {
        // Update existing stage
        const res = await fetch(`/api/goals/${stageGoal.id}/stages/${data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (res.ok) {
          const updatedStage = await res.json()
          setGoals((prev) =>
            prev.map((g) =>
              g.id === stageGoal.id
                ? { ...g, stages: g.stages?.map((s) => (s.id === data.id ? updatedStage : s)) }
                : g
            )
          )
        }
      } else {
        // Create new stage
        const res = await fetch(`/api/goals/${stageGoal.id}/stages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (res.ok) {
          const newStage = await res.json()
          setGoals((prev) =>
            prev.map((g) =>
              g.id === stageGoal.id
                ? { ...g, stages: [...(g.stages || []), newStage] }
                : g
            )
          )
        }
      }
      setIsStageEditorOpen(false)
    } catch (error) {
      console.error('Error saving stage:', error)
    }
  }

  const handleDeleteStage = async (stage: Stage) => {
    if (!confirm("Are you sure you want to delete this stage?")) return

    const goal = goals.find((g) => g.stages?.some((s) => s.id === stage.id))
    if (!goal) return

    try {
      const res = await fetch(`/api/goals/${goal.id}/stages/${stage.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setGoals((prev) =>
          prev.map((g) =>
            g.id === goal.id
              ? { ...g, stages: g.stages?.filter((s) => s.id !== stage.id) }
              : g
          )
        )
        setIsStageEditorOpen(false)
      }
    } catch (error) {
      console.error('Error deleting stage:', error)
    }
  }

  const handleNavigateFromCommand = (view: string, item?: any) => {
    setCurrentView(view as ViewMode)

    if (view === "goals" && item) {
      // Navigate to specific goal - would need to update GoalsView to support this
      console.log("Navigate to goal:", item)
    } else if (view === "time" && item) {
      // Navigate to specific task/event
      console.log("Navigate to time item:", item)
    } else if (view === "journal" && item) {
      // Navigate to specific entry
      setSelectedEntry(item)
    }
  }

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry)
    setNewEntryDate(undefined)
    setIsEditorOpen(true)
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
      goalId: task.goalId,
    }
    setEntries((prev) => [newEntry, ...prev])
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: true, dueDate: date } : t)))
    setIsDraggingTask(false)
    setDraggingTask(null)
  }

  const handleUpdateEntry = useCallback((updatedEntry: JournalEntry) => {
    setEntries((prev) => prev.map((e) => (e.id === updatedEntry.id ? { ...updatedEntry, updatedAt: new Date() } : e)))
  }, [])

  const handleUpdateEvent = useCallback(async (updatedEvent: any) => {
    // Store previous state for potential rollback
    setEvents((prev) => {
      const previousEvents = prev
      const optimisticUpdate = prev.map((e) => (e.id === updatedEvent.id ? { ...e, ...updatedEvent } : e))

      // Perform API call
      ;(async () => {
        try {
          const response = await fetch(`/api/events/${updatedEvent.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedEvent),
          })

          if (response.ok) {
            const updated = await response.json()
            setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
          } else {
            console.error('Error updating event: API returned', response.status)
            setEvents(previousEvents)
          }
        } catch (error) {
          console.error('Error updating event:', error)
          setEvents(previousEvents)
        }
      })()

      return optimisticUpdate
    })
  }, [])

  const showSidebars = focusLevel === "off"
  const showChat = focusLevel === "off"

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {showChat && (
        <AiChatSidebar selectedEntry={selectedEntry} />
      )}

      <div className="flex flex-1 flex-col">
        <NavigationBar
          currentView={currentView}
          onViewChange={setCurrentView}
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
              onOpenEntry={handleEditEntry}
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
              events={events}
              onCreateEvent={handleCreateEvent}
              onSelectEvent={(event) => {
                setEditingEvent(event as any)
                setIsEventEditorOpen(true)
              }}
              isDraggingTask={isDraggingTask}
              onTaskDrop={handleTaskDrop}
              onUpdateEvent={handleUpdateEvent}
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
              events={events}
              onCreateGoal={handleCreateGoal}
              onEditGoal={handleEditGoal}
              onArchiveGoal={handleArchiveGoal}
              onDeleteGoal={handleDeleteGoal}
              onCreateStage={handleCreateStage}
              onEditStage={handleEditStage}
              onDeleteStage={handleDeleteStage}
              onCreateTask={handleCreateTask}
              onCreateEvent={handleCreateEvent}
              onCreateJournalEntry={(goalId, stageId) => {
                // TODO: Implement journal entry creation with stage linking
                console.log("Create journal entry for goal:", goalId, "stage:", stageId)
              }}
            />
          </div>

          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-300",
              currentView === "settings" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
            )}
          >
            <SettingsView />
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
        event={editingEvent}
        isOpen={isEventEditorOpen}
        onClose={() => {
          setIsEventEditorOpen(false)
          setPrefillGoalId(undefined)
          setPrefillStageId(undefined)
          setEditorMode('event')
        }}
        onSaved={async () => {
          const eventsRes = await fetch('/api/events?type=event')
          if (eventsRes.ok) {
            const eventsData = await eventsRes.json()
            setEvents(eventsData)
          }
          setIsEventEditorOpen(false)
          setPrefillGoalId(undefined)
          setPrefillStageId(undefined)
          setEditorMode('event')
        }}
        initialDate={newEventDate}
        prefillGoalId={prefillGoalId}
        prefillStageId={prefillStageId}
        goals={goals}
        mode={editorMode}
      />

      <GoalEditor
        goal={editingGoal}
        isOpen={isGoalEditorOpen}
        onClose={() => setIsGoalEditorOpen(false)}
        onSave={handleSaveGoal}
        onDelete={handleDeleteGoal}
      />

      <StageEditor
        stage={editingStage}
        goal={stageGoal!}
        isOpen={isStageEditorOpen}
        onClose={() => setIsStageEditorOpen(false)}
        onSave={handleSaveStage}
        onDelete={handleDeleteStage}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        goals={goals}
        tasks={tasks}
        entries={entries}
        onNavigate={handleNavigateFromCommand}
      />

      <FocusModeIndicator />

      {showSidebars && (
        <TodoSidebar
          tasks={tasks}
          onTasksChange={setTasks}
          onDragStart={handleTaskDragStart}
          onDragEnd={handleTaskDragEnd}
        />
      )}
    </div>
  )
}

export function AppShell(props: AppShellProps) {
  return (
    <AuthGate>
      <FocusModeProvider>
        <AppShellContent {...props} />
      </FocusModeProvider>
    </AuthGate>
  )
}
