import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface CreateStageData {
  title: string
  description?: string
  targetDate?: string
  color?: string
  order: number
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify goal ownership
    const goal = await prisma.goal.findFirst({
      where: {
        id,
        userId: userId,
      },
    })

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const stages = await prisma.stage.findMany({
      where: {
        goalId: id,
      },
      include: {
        events: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: {
        order: "asc",
      },
    })

    return NextResponse.json(stages)
  } catch (error) {
    console.error("Error fetching stages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify goal ownership
    const goal = await prisma.goal.findFirst({
      where: {
        id,
        userId: userId,
      },
    })

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const data: CreateStageData = await request.json()

    const stage = await prisma.stage.create({
      data: {
        goalId: id,
        userId: userId,
        title: data.title,
        description: data.description,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        color: data.color,
        order: data.order,
      },
      include: {
        events: true,
      },
    })

    return NextResponse.json(stage, { status: 201 })
  } catch (error) {
    console.error("Error creating stage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
