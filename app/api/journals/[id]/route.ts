import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface UpdateJournalEntryData {
    title?: string
    content?: string
    folder?: string
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const entry = await prisma.journalEntry.findFirst({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    return NextResponse.json(entry)
  } catch (error) {
    console.error("Error fetching journal entry:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data: UpdateJournalEntryData = await request.json()

    const entry = await prisma.journalEntry.updateMany({
      where: {
        id: params.id,
        userId: userId,
      },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(data.folder && { folder: data.folder }),
        updatedAt: new Date(),
      },
    })

    if (entry.count === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    const updatedEntry = await prisma.journalEntry.findUnique({
      where: { id: params.id },
    })

    return NextResponse.json(updatedEntry)
  } catch (error) {
    console.error("Error updating journal entry:", error)
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

    const deletedEntry = await prisma.journalEntry.deleteMany({
      where: {
        id: params.id,
        userId: userId,
      },
    })

    if (deletedEntry.count === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Entry deleted successfully" })
  } catch (error) {
    console.error("Error deleting journal entry:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
