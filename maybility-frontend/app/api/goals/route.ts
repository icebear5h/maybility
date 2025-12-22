import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
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
        stages: {
          orderBy: {
            order: "asc",
          },
        },
        events: {
          select: {
            id: true,
            taskStatus: true,
            startTime: true,
            endTime: true,
            dueDate: true,
          },
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

    // Ensure user exists in database (auto-create if using JWT sessions without adapter)
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: session?.user?.email ?? "",
        name: session?.user?.name,
        image: session?.user?.image,
      },
    })

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
