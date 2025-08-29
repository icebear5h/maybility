"use client"

import { useState, useEffect } from "react"
import type { Goal, GoalTask, GoalUpdate } from "@prisma/client"

type GoalWithDetails = Goal & {
  tasks: GoalTask[]
  updates: (GoalUpdate & { task?: { title: string } })[]
}

const MOCK_GOAL_DETAILS: { [key: string]: GoalWithDetails } = {
  "goal-1": {
    id: "goal-1",
    userId: "user1",
    title: "Launch Personal Portfolio Website",
    description: "Create and deploy a professional portfolio website to showcase my work and skills",
    definitionOfDone: "Website is live, responsive, includes all projects, and has contact form working",
    targetDate: new Date("2025-12-31"),
    isArchived: false,
    createdAt: new Date("2025-08-01"),
    updatedAt: new Date("2025-08-14"),
    tasks: [
      {
        id: "task-1",
        goalId: "goal-1",
        title: "Design wireframes and mockups",
        description: "Create detailed wireframes for all pages",
        status: "done",
        dueAt: new Date("2025-08-15"),
        completedAt: new Date("2025-08-14"),
        isMilestone: false,
        createdAt: new Date("2025-08-01"),
        updatedAt: new Date("2025-08-14"),
      },
      {
        id: "task-2",
        goalId: "goal-1",
        title: "Set up development environment",
        description: "Configure Next.js, TypeScript, and Tailwind",
        status: "done",
        dueAt: new Date("2025-08-20"),
        completedAt: new Date("2025-08-16"),
        isMilestone: false,
        createdAt: new Date("2025-08-01"),
        updatedAt: new Date("2025-08-16"),
      },
      {
        id: "task-3",
        goalId: "goal-1",
        title: "Build homepage and about page",
        description: "Create responsive homepage with hero section and about page",
        status: "in_progress",
        dueAt: new Date("2025-08-25"),
        completedAt: null,
        isMilestone: true,
        createdAt: new Date("2025-08-01"),
        updatedAt: new Date("2025-08-17"),
      },
      {
        id: "task-4",
        goalId: "goal-1",
        title: "Create projects showcase",
        description: "Build projects page with detailed case studies",
        status: "todo",
        dueAt: new Date("2025-09-01"),
        completedAt: null,
        isMilestone: false,
        createdAt: new Date("2025-08-01"),
        updatedAt: new Date("2025-08-01"),
      },
      {
        id: "task-5",
        goalId: "goal-1",
        title: "Implement contact form",
        description: "Add working contact form with email integration",
        status: "todo",
        dueAt: new Date("2025-09-15"),
        completedAt: null,
        isMilestone: false,
        createdAt: new Date("2025-08-01"),
        updatedAt: new Date("2025-08-01"),
      },
      {
        id: "task-6",
        goalId: "goal-1",
        title: "Deploy to production",
        description: "Deploy website to Vercel and configure custom domain",
        status: "todo",
        dueAt: new Date("2025-10-01"),
        completedAt: null,
        isMilestone: true,
        createdAt: new Date("2025-08-01"),
        updatedAt: new Date("2025-08-01"),
      },
    ],
    updates: [
      {
        id: "update-1",
        goalId: "goal-1",
        taskId: "task-3",
        kind: "progress",
        content:
          "Made great progress on the homepage layout. The hero section is looking clean and the responsive design is working well across devices.",
        createdAt: new Date("2025-08-14"),
        updatedAt: new Date("2025-08-14"),
        task: { title: "Build homepage and about page" },
      },
      {
        id: "update-2",
        goalId: "goal-1",
        taskId: "task-2",
        kind: "completion",
        content:
          "Development environment is fully set up! Next.js 14 with TypeScript and Tailwind CSS configured perfectly.",
        createdAt: new Date("2025-08-10"),
        updatedAt: new Date("2025-08-10"),
        task: { title: "Set up development environment" },
      },
      {
        id: "update-3",
        goalId: "goal-1",
        taskId: null,
        kind: "reflection",
        content:
          "Starting this portfolio project feels exciting. The wireframes look professional and I'm confident this will showcase my skills well.",
        createdAt: new Date("2025-08-05"),
        updatedAt: new Date("2025-08-05"),
      },
    ],
  },
  "goal-2": {
    id: "goal-2",
    userId: "user1",
    title: "Master React and TypeScript",
    description: "Become proficient in React with TypeScript for modern web development",
    definitionOfDone:
      "Can build complex React apps with TypeScript, understand advanced patterns, and contribute to open source",
    targetDate: new Date("2025-11-30"),
    isArchived: false,
    createdAt: new Date("2025-07-15"),
    updatedAt: new Date("2025-08-12"),
    tasks: [
      {
        id: "task-7",
        goalId: "goal-2",
        title: "Complete TypeScript fundamentals course",
        description: "Finish the comprehensive TypeScript course on Udemy",
        status: "done",
        dueAt: new Date("2025-08-01"),
        completedAt: new Date("2025-07-30"),
        isMilestone: false,
        createdAt: new Date("2025-07-15"),
        updatedAt: new Date("2025-07-30"),
      },
      {
        id: "task-8",
        goalId: "goal-2",
        title: "Build 3 React projects with TypeScript",
        description: "Create todo app, weather app, and e-commerce demo",
        status: "in_progress",
        dueAt: new Date("2025-08-30"),
        completedAt: null,
        isMilestone: false,
        createdAt: new Date("2025-07-15"),
        updatedAt: new Date("2025-08-12"),
      },
      {
        id: "task-9",
        goalId: "goal-2",
        title: "Learn advanced React patterns",
        description: "Master hooks, context, suspense, and performance optimization",
        status: "todo",
        dueAt: new Date("2025-09-15"),
        completedAt: null,
        isMilestone: true,
        createdAt: new Date("2025-07-15"),
        updatedAt: new Date("2025-07-15"),
      },
      {
        id: "task-10",
        goalId: "goal-2",
        title: "Contribute to open source React project",
        description: "Make meaningful contributions to a popular React library",
        status: "todo",
        dueAt: new Date("2025-10-15"),
        completedAt: null,
        isMilestone: false,
        createdAt: new Date("2025-07-15"),
        updatedAt: new Date("2025-07-15"),
      },
    ],
    updates: [
      {
        id: "update-4",
        goalId: "goal-2",
        taskId: "task-8",
        kind: "progress",
        content:
          "Finished the todo app with TypeScript! The type safety really helps catch bugs early. Working on the weather app next.",
        createdAt: new Date("2025-08-12"),
        updatedAt: new Date("2025-08-12"),
        task: { title: "Build 3 React projects with TypeScript" },
      },
      {
        id: "update-5",
        goalId: "goal-2",
        taskId: "task-7",
        kind: "completion",
        content: "TypeScript course completed! Feel much more confident with types, interfaces, and generics now.",
        createdAt: new Date("2025-08-01"),
        updatedAt: new Date("2025-08-01"),
        task: { title: "Complete TypeScript fundamentals course" },
      },
    ],
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
