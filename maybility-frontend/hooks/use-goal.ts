"use client"

import { useState, useEffect } from "react"
import { Goal, Task, Update, TaskStatus, Priority, UpdateKind } from "@prisma/client"

type TaskWithDetails = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  dueDate: Date | null
  scheduledDate: Date | null
  startTime: string | null
  endTime: string | null
  estimatedDuration: number | null
  color: string
  userId: string
  goalId: string | null
  createdAt: Date
  updatedAt: Date
  rrule: string | null
  dtstart: Date | null
  timezone: string
  isMilestone: boolean
}

type UpdateWithDetails = {
  id: string
  kind: UpdateKind
  body: string
  createdAt: Date
  task?: { title: string }
}

type GoalWithDetails = Goal & {
  tasks: TaskWithDetails[]
  updates: UpdateWithDetails[]
}

const MOCK_GOAL_DETAILS: { [key: string]: GoalWithDetails } = {
  "goal-1": {
    id: "goal-1",
    userId: "user1",
    title: "Launch Personal Portfolio Website",
    description: "Create and deploy a professional portfolio website to showcase my work and skills",
    definitionOfDone: "Website is live, responsive, includes all projects, and has contact form working",
    targetDate: new Date("2025-12-31"),
    createdAt: new Date("2025-08-01"),
    updatedAt: new Date("2025-08-14"),
    color: "blue",
    archived: false,
    tasks: [],
    updates: [],
  },
}

export function useGoal(goalId: string) {
  const [goal, setGoal] = useState<GoalWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoal = async () => {
    try {
      setIsLoading(true)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const mockGoal = MOCK_GOAL_DETAILS[goalId]

      if (!mockGoal) {
        setGoal(null)
        setError("Goal not found")
        return
      }

      setGoal(mockGoal)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setGoal(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (goalId) {
      fetchGoal()
    }
  }, [goalId])

  return {
    goal,
    isLoading,
    error,
    refetch: fetchGoal,
  }
}
