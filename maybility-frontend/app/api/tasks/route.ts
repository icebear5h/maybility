import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { expandRecurringEvent } from "@/lib/recurring-events"
import type { Occurrence } from "@/types/calendar-types"

interface CreateTaskData {
  title: string
  description?: string
  status?: "TODO" | "IN_PROGRESS" | "DONE"
  dueDate?: string
  scheduledDate?: string
  startTime?: string
  endTime?: string
  estimatedDuration?: number
  priority?: "LOW" | "MEDIUM" | "HIGH"
  color?: string
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeScheduled = searchParams.get("includeScheduled") === "true"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (includeScheduled) {
      // Return expanded calendar events (tasks with scheduled dates)
      const now = new Date()
      const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const rangeStart = startDate ? new Date(startDate) : defaultStart
      const rangeEnd = endDate ? new Date(endDate) : defaultEnd

      // Fetch all tasks with scheduled dates (both recurring and non-recurring)
      const tasks = await prisma.task.findMany({
        where: {
          userId,
          scheduledDate: {
            not: null,
          },
        },
        orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
      })

      const allOccurrences: Occurrence[] = []

      for (const task of tasks) {
        if (task.rrule) {
          // Expand recurring events into individual instances
          const recurringInstances = expandRecurringEvent(task, rangeStart, rangeEnd)
          allOccurrences.push(...recurringInstances)
        } else if (task.scheduledDate) {
          // Handle single events
          const taskDate = new Date(task.scheduledDate)
          
          // Only include if within requested range
          if (taskDate >= rangeStart && taskDate <= rangeEnd) {
            const startDateTime = new Date(taskDate)
            const endDateTime = new Date(taskDate)

            // Set times if available
            if (task.startTime) {
              const [hours, minutes] = task.startTime.split(':').map(Number)
              startDateTime.setHours(hours, minutes, 0, 0)
            }

            if (task.endTime) {
              const [hours, minutes] = task.endTime.split(':').map(Number)
              endDateTime.setHours(hours, minutes, 0, 0)
            } else if (task.startTime) {
              // Default to 1 hour duration
              endDateTime.setTime(startDateTime.getTime() + 60 * 60 * 1000)
            }

            const occurrence: Occurrence = {
              id: task.id,
              taskId: task.id,
              title: task.title,
              description: task.description || "",
              startUtc: startDateTime.toISOString(),
              endUtc: endDateTime.toISOString(),
              color: task.color || "#3b82f6",
              status: task.status,
              source: "SINGLE" as const,
              isRecurring: false,
              hasOverride: false
            }

            allOccurrences.push(occurrence)
          }
        }
      }

      // Sort by start time
      allOccurrences.sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime())

      return NextResponse.json(allOccurrences)
    } else {
      // Return regular tasks (for sidebar)
      const tasks = await prisma.task.findMany({
        where: {
          userId,
        },
        orderBy: [
          { status: "asc" },
          { priority: "desc" },
          { createdAt: "desc" },
        ],
      })

      return NextResponse.json(tasks)
    }
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data: CreateTaskData = await request.json()

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description || "",
        status: data.status || "TODO",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        estimatedDuration: data.estimatedDuration || null,
        priority: data.priority || "MEDIUM",
        color: data.color || "#3b82f6",
        userId,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}