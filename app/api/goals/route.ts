import { type NextRequest, NextResponse } from "next/server"
import { auth, authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface CreateGoalData {
    title: string
    description: string
    targetDate: string
    definitionOfDone: string
    color: string
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const archived = searchParams.get("archived")

    const whereClause: any = {
      userId,
    }

    if (archived !== null) {
      whereClause.archived = archived === "true"
    }

    const goals = await prisma.goal.findMany({
      where: whereClause,
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
            dueDate: true,
          },
        },
        updates: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(goals)
  } catch (error) {
    console.error("Error fetching goals:", error)
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

    const data: CreateGoalData = await request.json()

    const goal = await prisma.goal.create({
      data: {
        title: data.title,
        description: data.description,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        definitionOfDone: data.definitionOfDone,
        color: data.color,
        userId: userId,
      },
    })

    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    console.error("Error creating goal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
