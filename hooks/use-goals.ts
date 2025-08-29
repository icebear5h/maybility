"use client"

import { useState, useEffect } from "react"
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

type GoalWithProgress = Goal & {
  tasks: TaskWithDetails[]
  updates: Array<{ createdAt: Date; kind: string; body: string }>
}

interface UseGoalsOptions {
  archived?: boolean
}

const MOCK_GOALS: GoalWithProgress[] = [
  {
    id: "goal-1",
    userId: "user1",
    title: "Launch Personal Portfolio Website",
    description: "Create and deploy a professional portfolio website to showcase my work and skills",
    definitionOfDone: "Website is live, responsive, includes all projects, and has contact form working",
    targetDate: new Date("2025-12-31"),
    color: "blue",
    archived: false,
    createdAt: new Date("2025-08-01"),
    updatedAt: new Date("2025-08-14"),
    tasks: [
      {
        id: "task-1",
        title: "Design wireframes and mockups",
        status: "DONE",
        dueDate: new Date("2025-08-15"),
        scheduledDate: new Date("2025-08-15"),
        startTime: "09:00",
        endTime: "12:00",
        isMilestone: false,
        priority: "HIGH",
        color: "BLUE",
        estimatedDuration: 180,
      },
      {
        id: "task-2",
        title: "Set up development environment",
        status: "DONE",
        dueDate: new Date("2025-08-20"),
        scheduledDate: new Date("2025-08-20"),
        startTime: "14:00",
        endTime: "16:00",
        isMilestone: false,
        priority: "MEDIUM",
        color: "GREEN",
        estimatedDuration: 120,
      },
      {
        id: "task-3",
        title: "Build homepage and navigation",
        status: "IN_PROGRESS",
        dueDate: new Date("2025-08-25"),
        scheduledDate: new Date("2025-08-25"),
        startTime: "10:00",
        endTime: "15:00",
        isMilestone: true,
        priority: "HIGH",
        color: "RED",
        estimatedDuration: 300,
      },
      {
        id: "task-4",
        title: "Create project showcase pages",
        status: "TODO",
        dueDate: new Date("2025-09-01"),
        scheduledDate: null,
        startTime: null,
        endTime: null,
        isMilestone: false,
        priority: "MEDIUM",
        color: "BLUE",
        estimatedDuration: 240,
      },
      {
        id: "task-5",
        title: "Implement contact form",
        status: "TODO",
        dueDate: new Date("2025-09-15"),
        scheduledDate: null,
        startTime: null,
        endTime: null,
        isMilestone: false,
        priority: "MEDIUM",
        color: "GREEN",
        estimatedDuration: 120,
      },
      {
        id: "task-6",
        title: "Deploy to production",
        status: "TODO",
        dueDate: new Date("2025-10-01"),
        scheduledDate: null,
        startTime: null,
        endTime: null,
        isMilestone: true,
        priority: "HIGH",
        color: "PURPLE",
        estimatedDuration: 60,
      },
    ],
    updates: [
      {
        createdAt: new Date("2025-08-14"),
        kind: "REFLECTION",
        body: "Made great progress on the homepage layout. The hero section is looking clean and the responsive design is working well across devices.",
      },
      {
        createdAt: new Date("2025-08-10"),
        kind: "TASK_COMPLETION",
        body: "Completed the development environment setup. Ready to start building!",
      },
      {
        createdAt: new Date("2025-08-05"),
        kind: "MILESTONE",
        body: "Started the portfolio project. Excited to showcase my work!",
      },
    ],
  },
  {
    id: "goal-2",
    userId: "user1",
    title: "Master React and TypeScript",
    description: "Become proficient in React with TypeScript for modern web development",
    definitionOfDone:
      "Can build complex React apps with TypeScript, understand advanced patterns, and contribute to open source",
    targetDate: new Date("2025-11-30"),
    color: "green",
    archived: false,
    createdAt: new Date("2025-07-15"),
    updatedAt: new Date("2025-08-12"),
    tasks: [
      {
        id: "task-7",
        title: "Learn React basics",
        status: "DONE",
        dueDate: new Date("2025-08-01"),
        scheduledDate: new Date("2025-08-01"),
        startTime: "09:00",
        endTime: "12:00",
        isMilestone: false,
        priority: "LOW",
        color: "BLUE",
        estimatedDuration: 180,
      },
      {
        id: "task-8",
        title: "Understand TypeScript fundamentals",
        status: "IN_PROGRESS",
        dueDate: new Date("2025-08-30"),
        scheduledDate: new Date("2025-08-30"),
        startTime: "14:00",
        endTime: "16:00",
        isMilestone: false,
        priority: "MEDIUM",
        color: "GREEN",
        estimatedDuration: 120,
      },
      {
        id: "task-9",
        title: "Build a simple React app with TypeScript",
        status: "TODO",
        dueDate: new Date("2025-09-15"),
        scheduledDate: null,
        startTime: null,
        endTime: null,
        isMilestone: true,
        priority: "HIGH",
        color: "RED",
        estimatedDuration: 300,
      },
      {
        id: "task-10",
        title: "Explore advanced React patterns",
        status: "TODO",
        dueDate: new Date("2025-10-15"),
        scheduledDate: null,
        startTime: null,
        endTime: null,
        isMilestone: false,
        priority: "MEDIUM",
        color: "BLUE",
        estimatedDuration: 240,
      },
    ],
    updates: [
      { createdAt: new Date("2025-08-12"), kind: "TASK_COMPLETION", body: "Completed learning React basics." },
      { createdAt: new Date("2025-08-01"), kind: "MILESTONE", body: "Started mastering React with TypeScript." },
    ],
  },
  {
    id: "goal-3",
    userId: "user1",
    title: "Build SaaS Side Project",
    description: "Create and launch a profitable SaaS application",
    definitionOfDone: "App is live, has paying customers, and generates $1000+ MRR",
    targetDate: new Date("2026-06-30"),
    color: "purple",
    archived: false,
    createdAt: new Date("2025-08-10"),
    updatedAt: new Date("2025-08-13"),
    tasks: [
      {
        id: "task-11",
        title: "Define project scope and requirements",
        status: "IN_PROGRESS",
        dueDate: new Date("2025-09-01"),
        scheduledDate: new Date("2025-09-01"),
        startTime: "10:00",
        endTime: "15:00",
        isMilestone: true,
        priority: "HIGH",
        color: "RED",
        estimatedDuration: 300,
      },
      {
        id: "task-12",
        title: "Design database schema",
        status: "TODO",
        dueDate: new Date("2025-10-01"),
        scheduledDate: null,
        startTime: null,
        endTime: null,
        isMilestone: false,
        priority: "MEDIUM",
        color: "BLUE",
        estimatedDuration: 240,
      },
      {
        id: "task-13",
        title: "Implement core features",
        status: "TODO",
        dueDate: new Date("2025-11-01"),
        scheduledDate: null,
        startTime: null,
        endTime: null,
        isMilestone: false,
        priority: "HIGH",
        color: "GREEN",
        estimatedDuration: 360,
      },
      {
        id: "task-14",
        title: "Launch and market the app",
        status: "TODO",
        dueDate: new Date("2025-12-01"),
        scheduledDate: null,
        startTime: null,
        endTime: null,
        isMilestone: true,
        priority: "LOW",
        color: "BLUE",
        estimatedDuration: 480,
      },
    ],
    updates: [
      {
        createdAt: new Date("2025-08-13"),
        kind: "REFLECTION",
        body: "Initial planning for the SaaS project is underway.",
      },
    ],
  },
  {
    id: "goal-4",
    userId: "user1",
    title: "Get AWS Solutions Architect Certification",
    description: "Earn AWS Solutions Architect Associate certification to advance cloud skills",
    definitionOfDone: "Pass the AWS SAA-C03 exam with a score of 750+",
    targetDate: new Date("2025-10-31"),
    color: "red",
    archived: false,
    createdAt: new Date("2025-08-05"),
    updatedAt: new Date("2025-08-11"),
    tasks: [
      {
        id: "task-15",
        title: "Study AWS fundamentals",
        status: "DONE",
        dueDate: new Date("2025-08-10"),
        scheduledDate: new Date("2025-08-10"),
        startTime: "09:00",
        endTime: "12:00",
        isMilestone: false,
        priority: "LOW",
        color: "BLUE",
        estimatedDuration: 180,
      },
      {
        id: "task-16",
        title: "Practice exam questions",
        status: "TODO",
        dueDate: new Date("2025-09-01"),
        scheduledDate: null,
        startTime: null,
        endTime: null,
        isMilestone: false,
        priority: "MEDIUM",
        color: "GREEN",
        estimatedDuration: 240,
      },
      {
        id: "task-17",
        title: "Complete the certification exam",
        status: "TODO",
        dueDate: new Date("2025-09-30"),
        scheduledDate: null,
        startTime: null,
        endTime: null,
        isMilestone: true,
        priority: "HIGH",
        color: "RED",
        estimatedDuration: 300,
      },
      {
        id: "task-18",
        title: "Review exam results and study areas for improvement",
        status: "TODO",
        dueDate: new Date("2025-10-25"),
        scheduledDate: null,
        startTime: null,
        endTime: null,
        isMilestone: false,
        priority: "LOW",
        color: "BLUE",
        estimatedDuration: 120,
      },
    ],
    updates: [
      { createdAt: new Date("2025-08-11"), kind: "TASK_COMPLETION", body: "Completed studying AWS fundamentals." },
    ],
  },
]

export function useGoals(options: UseGoalsOptions = {}) {
  const [goals, setGoals] = useState<GoalWithProgress[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoals = async () => {
    try {
      setIsLoading(true)

      let filteredGoals = MOCK_GOALS

      if (options.archived !== undefined) {
        filteredGoals = MOCK_GOALS.filter((goal) => goal.archived === options.archived)
      }

      await new Promise((resolve) => setTimeout(resolve, 100))

      setGoals(filteredGoals)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setGoals(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGoals()
  }, [options.archived])

  return {
    goals,
    isLoading,
    error,
    refetch: fetchGoals,
  }
}
