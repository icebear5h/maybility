import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get("goalId")
    const stageId = searchParams.get("stageId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const type = searchParams.get("type") // "task" | "event" | "all"
    const taskStatus = searchParams.get("taskStatus") // Filter by task status

    const whereClause: any = {
      userId,
    }

    if (goalId) {
      whereClause.goalId = goalId
    }

    if (stageId) {
      whereClause.stageId = stageId
    }

    // Filter by type (task vs event)
    if (type === "task") {
      whereClause.taskStatus = { not: null }
    } else if (type === "event") {
      whereClause.startTime = { not: null }
    }

    // Filter by specific task status
    if (taskStatus) {
      whereClause.taskStatus = taskStatus
    }

    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)

      whereClause.OR = [
        // Single events that overlap with range
        {
          occurrenceType: 'SINGLE',
          startTime: { lte: end, not: null },
          endTime: { gte: start },
        },
        // Recurring events (client will expand)
        {
          occurrenceType: 'RECURRING',
        },
        // Tasks with dueDate in range
        {
          dueDate: {
            gte: start,
            lte: end,
          },
        },
      ]
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        goal: {
          select: {
            id: true,
            title: true,
            color: true,
          },
        },
        stage: {
          select: {
            id: true,
            title: true,
          },
        },
        exceptions: true,
        overrides: true,
        attendees: true,
        reminders: true,
      },
      orderBy: [
        { startTime: "asc" },
        { dueDate: "asc" },
        { createdAt: "asc" },
      ],
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error("Error fetching events:", error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user exists in DB (auto-create if using JWT without adapter)
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!user) {
      // Auto-create user record if using JWT auth without Prisma adapter
      const email = session?.user?.email
      if (!email) {
        return NextResponse.json({ error: 'Email required' }, { status: 400 })
      }
      user = await prisma.user.create({
        data: {
          id: userId,
          email,
          name: session?.user?.name,
          image: session?.user?.image,
        },
        select: { id: true }
      })
    }

    const data: any = await request.json()

    if (!data.title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      )
    }

    // Determine if this is a task or event based on provided fields
    const isTask = data.taskStatus !== undefined
    const isScheduled = data.startTime && data.endTime && data.timezone

    // Build event data
    const eventData: any = {
      title: data.title,
      description: data.description,
      location: data.location,
      url: data.url,
      userId,
      color: data.color || '#3b82f6',
      eventStatus: data.eventStatus || 'CONFIRMED',
      visibility: data.visibility || 'PRIVATE',
      isAllDay: data.isAllDay || false,
      occurrenceType: data.rrule ? 'RECURRING' : 'SINGLE',
      rrule: data.rrule,
    }

    // Scheduled time fields (for calendar events or scheduled tasks)
    if (isScheduled) {
      eventData.startTime = new Date(data.startTime)
      eventData.endTime = new Date(data.endTime)
      eventData.timezone = data.timezone
    }

    // Task fields (for unscheduled or scheduled tasks)
    if (isTask) {
      eventData.taskStatus = data.taskStatus
      eventData.priority = data.priority || 'MEDIUM'
      if (data.dueDate) eventData.dueDate = new Date(data.dueDate)
      if (data.completedAt) eventData.completedAt = new Date(data.completedAt)
    } else {
      eventData.priority = 'MEDIUM' // Default for events
    }

    // Optional fields
    if (data.goalId) eventData.goalId = data.goalId
    if (data.stageId) eventData.stageId = data.stageId
    if (data.entryPath) eventData.entryPath = data.entryPath

    const event = await prisma.event.create({
      data: eventData,
      include: {
        goal: {
          select: {
            id: true,
            title: true,
            color: true,
          },
        },
        stage: {
          select: {
            id: true,
            title: true,
          },
        },
        attendees: true,
        reminders: true,
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return NextResponse.json(
      { error: 'Failed to create event', details: errorMessage },
      { status: 500 }
    )
  }
}
