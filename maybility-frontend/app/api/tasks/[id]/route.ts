import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TaskStatus, Priority, OccurrenceType } from "@prisma/client"

interface updateTaskData {
  id: string,
  title: string,
  description: string,
  status: TaskStatus,
  priority: Priority,
  color: string,
  userId: string,
  goalId?: string,
  createdAt?: Date,
  updatedAt?: Date,
  timezone?: string,
  // Discriminator field - determines which type of event this is
  occurrenceType: OccurrenceType,
  
  dtstart?: Date,
  startTime?: string,
  endTime?: string,

  
  // Recurring event fields (only used when eventType = RECURRING)
  rrule?: string,
  endDate?: Date,

  // Relations
  user: string,
  goal?: string,
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: taskId } = await params; 
    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data: updateTaskData = await request.json()

    // Get the task and verify ownership
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (data.title !== null) updateData.title = data.title
    if (data.description !== null) updateData.description = data.description
    if (data.status !== null) updateData.status = data.status
    if (data.priority !== null) updateData.priority = data.priority
    if (data.color !== null) updateData.color = data.color
    if (data.startTime !== null) updateData.startTime = data.startTime
    if (data.endTime !== null) updateData.endTime = data.endTime
    
    if (data.dtstart !== null) {
      updateData.dtstart = data.dtstart ? new Date(data.dtstart) : null
    }
    if (data.rrule !== null) {
      updateData.rrule = data.rrule
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Await params.id
    const { id: taskId } = await params;
    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the task and verify ownership
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    await prisma.task.delete({
      where: { id: taskId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
