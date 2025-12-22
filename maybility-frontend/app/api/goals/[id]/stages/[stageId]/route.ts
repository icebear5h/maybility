import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface UpdateStageData {
  title?: string
  description?: string
  targetDate?: string
  color?: string
  order?: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, stageId } = await params
    const stage = await prisma.stage.findFirst({
      where: {
        id: stageId,
        goalId: id,
        userId: userId,
      },
      include: {
        events: {
          orderBy: [
            { startTime: "asc" },
            { dueDate: "asc" },
            { createdAt: "asc" },
          ],
        },
      },
    })

    if (!stage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 })
    }

    return NextResponse.json(stage)
  } catch (error) {
    console.error("Error fetching stage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, stageId } = await params
    const data: UpdateStageData = await request.json()

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.targetDate !== undefined) {
      updateData.targetDate = data.targetDate ? new Date(data.targetDate) : null
    }
    if (data.color !== undefined) updateData.color = data.color
    if (data.order !== undefined) updateData.order = data.order

    const result = await prisma.stage.updateMany({
      where: {
        id: stageId,
        goalId: id,
        userId: userId,
      },
      data: updateData,
    })

    if (result.count === 0) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 })
    }

    const updatedStage = await prisma.stage.findUnique({
      where: { id: stageId },
      include: {
        events: {
          orderBy: [
            { startTime: "asc" },
            { dueDate: "asc" },
            { createdAt: "asc" },
          ],
        },
      },
    })

    return NextResponse.json(updatedStage)
  } catch (error) {
    console.error("Error updating stage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, stageId } = await params
    const result = await prisma.stage.deleteMany({
      where: {
        id: stageId,
        goalId: id,
        userId: userId,
      },
    })

    if (result.count === 0) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting stage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
