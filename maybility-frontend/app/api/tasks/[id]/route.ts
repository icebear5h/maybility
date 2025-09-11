import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface UpdateTaskData {
  title?: string
  description?: string
  status?: "TODO" | "IN_PROGRESS" | "DONE"
  priority?: "LOW" | "MEDIUM" | "HIGH"
  dueDate?: string | null
  scheduledDate?: string | null
  startTime?: string | null
  endTime?: string | null
  estimatedDuration?: number | null
  color?: string
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {

    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data: UpdateTaskData = await request.json()

    // Get the task and verify ownership
    const task = await prisma.task.findFirst({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.status !== undefined) updateData.status = data.status
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.color !== undefined) updateData.color = data.color
    if (data.estimatedDuration !== undefined) updateData.estimatedDuration = data.estimatedDuration
    if (data.startTime !== undefined) updateData.startTime = data.startTime
    if (data.endTime !== undefined) updateData.endTime = data.endTime
    
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
    }
    if (data.scheduledDate !== undefined) {
      updateData.scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : null
    }

    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the task and verify ownership
    const task = await prisma.task.findFirst({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    await prisma.task.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
