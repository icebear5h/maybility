import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface CreateEventData {
  title: string
  date: string
  startTime: string
  endTime: string
  color?: string
  goalId?: string
  description?: string
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const whereClause: any = {
      userId,
      scheduledDate: {
        not: null,
      },
    }

    if (startDate && endDate) {
      whereClause.scheduledDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Error fetching events:", error)
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

    const data: CreateEventData = await request.json()

    // Validate required fields
    if (!data.title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (!data.date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 })
    }

    if (!data.startTime || !data.endTime) {
      return NextResponse.json({ error: "Start time and end time are required" }, { status: 400 })
    }

    // Validate date format
    const eventDate = new Date(data.date)
    if (isNaN(eventDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(data.startTime) || !timeRegex.test(data.endTime)) {
      return NextResponse.json({ error: "Invalid time format. Use HH:MM format." }, { status: 400 })
    }

    // Get goal color if goalId is provided
    let taskColor = data.color || "#3b82f6"
    if (data.goalId) {
      const goal = await prisma.goal.findFirst({
        where: {
          id: data.goalId,
          userId: userId,
        },
        select: {
          color: true,
        },
      })
      
      if (goal) {
        taskColor = goal.color
      }
    }

    const task = await prisma.task.create({
      data: {
        title: data.title.trim(),
        description: data.description || "",
        scheduledDate: eventDate,
        startTime: data.startTime,
        endTime: data.endTime,
        color: taskColor,
        goalId: data.goalId || null,
        userId,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error("Error creating event:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
