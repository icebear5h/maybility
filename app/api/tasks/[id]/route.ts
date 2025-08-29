import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { UpdateGoalTaskData } from "@/types/api-types"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data: UpdateGoalTaskData = await request.json()

    // Get the task and verify ownership through goal
    const task = await prisma.goalTask.findFirst({
      where: {
        id: params.id,
      },
      include: {
        goal: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!task || task.goal.userId !== session.user.id) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (data.title !== undefined) updateData.title = data.title
    if (data.isMilestone !== undefined) updateData.isMilestone = data.isMilestone
    if (data.dueAt !== undefined) {
      updateData.dueAt = data.dueAt ? new Date(data.dueAt) : null
    }

    // Handle status change and auto-create updates
    if (data.status !== undefined && data.status !== task.status) {
      updateData.status = data.status

      // If task is being marked as done, create an update
      if (data.status === "DONE") {
        const updateKind = task.isMilestone ? "MILESTONE" : "TASK_COMPLETION"
        const defaultBody = task.isMilestone ? `Milestone reached: ${task.title}` : `Completed: ${task.title}`

        await prisma.goalUpdate.create({
          data: {
            goalId: task.goalId,
            kind: updateKind,
            taskId: task.id,
            body: data.updateBody || defaultBody,
          },
        })
      }
    }

    const updatedTask = await prisma.goalTask.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error("Error updating goal task:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
