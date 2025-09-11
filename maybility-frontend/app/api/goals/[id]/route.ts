import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface UpdateGoalData {
    title?: string
    description?: string
    targetDate?: string
    definitionOfDone?: string
    color?: string
    archived?: boolean
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const goal = await prisma.goal.findFirst({
      where: {
        id: params.id,
        userId: userId,
      },
      include: {
        tasks: {
          orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
        },
        updates: {
          include: {
            task: {
              select: {
                title: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    return NextResponse.json(goal)
  } catch (error) {
    console.error("Error fetching goal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data: UpdateGoalData = await request.json()

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.targetDate !== undefined) {
      updateData.targetDate = data.targetDate ? new Date(data.targetDate) : null
    }
    if (data.definitionOfDone !== undefined) updateData.definitionOfDone = data.definitionOfDone
    if (data.color !== undefined) updateData.color = data.color
    if (data.archived !== undefined) updateData.archived = data.archived

    const goal = await prisma.goal.updateMany({
      where: {
        id: params.id,
        userId: userId,
      },
      data: updateData,
    })

    if (goal.count === 0) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const updatedGoal = await prisma.goal.findUnique({
      where: { id: params.id },
      include: {
        tasks: true,
        updates: {
          include: {
            task: {
              select: {
                title: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    return NextResponse.json(updatedGoal)
  } catch (error) {
    console.error("Error updating goal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
