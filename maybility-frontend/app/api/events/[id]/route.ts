import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface UpdateEventData {
  title?: string
  date?: string
  startTime?: string
  endTime?: string
  color?: string
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data: UpdateEventData = await request.json()

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (data.title !== undefined) updateData.title = data.title
    if (data.date !== undefined) updateData.scheduledDate = new Date(data.date)
    if (data.startTime !== undefined) updateData.startTime = data.startTime
    if (data.endTime !== undefined) updateData.endTime = data.endTime
    if (data.color !== undefined) updateData.color = data.color

    const task = await prisma.task.updateMany({
      where: {
        id: params.id,
        userId,
      },
      data: updateData,
    })

    if (task.count === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const updatedTask = await prisma.task.findUnique({
      where: { id: params.id },
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

    return NextResponse.json({ message: "Task deleted successfully" })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
