import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const event = await prisma.event.findUnique({
      where: { id },
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
    })

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    if (event.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error("Error fetching event:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check event exists and belongs to user
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    if (existingEvent.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const data: any = await request.json()

    // Build update data
    const updateData: any = {}

    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.location !== undefined) updateData.location = data.location
    if (data.url !== undefined) updateData.url = data.url

    // Schedule fields
    if (data.startTime !== undefined) {
      updateData.startTime = data.startTime ? new Date(data.startTime) : null
    }
    if (data.endTime !== undefined) {
      updateData.endTime = data.endTime ? new Date(data.endTime) : null
    }
    if (data.timezone !== undefined) updateData.timezone = data.timezone
    if (data.isAllDay !== undefined) updateData.isAllDay = data.isAllDay

    // Task fields
    if (data.taskStatus !== undefined) updateData.taskStatus = data.taskStatus
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
    }
    if (data.completedAt !== undefined) {
      updateData.completedAt = data.completedAt ? new Date(data.completedAt) : null
    }

    // Event metadata
    if (data.eventStatus !== undefined) updateData.eventStatus = data.eventStatus
    if (data.visibility !== undefined) updateData.visibility = data.visibility
    if (data.color !== undefined) updateData.color = data.color
    if (data.rrule !== undefined) {
      updateData.rrule = data.rrule
      updateData.occurrenceType = data.rrule ? 'RECURRING' : 'SINGLE'
    }

    // Relations
    if (data.goalId !== undefined) updateData.goalId = data.goalId
    if (data.stageId !== undefined) updateData.stageId = data.stageId
    if (data.entryPath !== undefined) updateData.entryPath = data.entryPath

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
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
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error("Error updating event:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check event exists and belongs to user
    const event = await prisma.event.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    if (event.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.event.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting event:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
