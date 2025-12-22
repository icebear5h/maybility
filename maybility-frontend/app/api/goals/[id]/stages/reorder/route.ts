import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface ReorderStagesData {
  stages: Array<{
    id: string
    order: number
  }>
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const data: ReorderStagesData = await request.json()

    // Update all stage orders in a transaction
    await prisma.$transaction(
      data.stages.map((stage) =>
        prisma.stage.updateMany({
          where: {
            id: stage.id,
            goalId: id,
            userId: userId,
          },
          data: {
            order: stage.order,
          },
        })
      )
    )

    // Return updated stages
    const updatedStages = await prisma.stage.findMany({
      where: {
        goalId: id,
        userId: userId,
      },
      orderBy: {
        order: "asc",
      },
    })

    return NextResponse.json(updatedStages)
  } catch (error) {
    console.error("Error reordering stages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
