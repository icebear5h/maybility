import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface CreateGoalTaskData {
    title: string
    isMilestone: boolean
    dueAt: string
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify goal ownership
    const goal = await prisma.goal.findFirst({
      where: {
        id: params.id,
        userId: userId,
      },
    })

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const tasks = await prisma.task.findMany({
      where: {
        goalId: params.id,
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Error fetching goal tasks:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify goal ownership
    const goal = await prisma.goal.findFirst({
      where: {
        id: params.id,
        userId: userId,
      },
    })

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const data: CreateGoalTaskData = await request.json()

    const task = await prisma.task.create({
      data: {
        goalId: params.id,
        title: data.title,
        dueDate: data.dueAt ? new Date(data.dueAt) : null,
        userId: userId,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error("Error creating goal task:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
