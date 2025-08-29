import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UpdateKind } from "@prisma/client"

interface CreateGoalUpdateData {
    kind: string
    taskId: string
    body: string
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

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    const updates = await prisma.update.findMany({
      where: {
        goalId: params.id,
        ...(cursor && {
          createdAt: {
            lt: new Date(cursor),
          },
        }),
      },
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
      take: limit,
    })

    return NextResponse.json(updates)
  } catch (error) {
    console.error("Error fetching goal updates:", error)
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

    const data: CreateGoalUpdateData = await request.json()

    const update = await prisma.update.create({
      data: {
        goalId: params.id,
        taskId: data.taskId,
        body: data.body,
        userId: userId,
        kind: data.kind as UpdateKind,
      },
      include: {
        task: {
          select: {
            title: true,
          },
        },
      },
    })

    return NextResponse.json(update, { status: 201 })
  } catch (error) {
    console.error("Error creating goal update:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
