import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

interface CreateJournalEntryData {
    title: string
    content: string
    // Accept either folderId (preferred) or legacy folder
    folderId?: string
    folder?: string
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const folder = searchParams.get("folder") // legacy param name; represents folderId
    const search = searchParams.get("search")

    const whereClause: any = {
      userId,
    }

    if (folder) {
      // Filter by folderId in DB schema
      whereClause.folderId = folder
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ]
    }

    const entries = await prisma.journalEntry.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error("Error fetching journal entries:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  // ✅ your snippet
  const session = await auth()
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json().catch(() => ({} as any))
  const title = (body?.title as string) ?? "New Entry"
  const content = (body?.content as string) ?? ""
  const folderId = (body?.folderId as string | null | undefined) ?? "root"

  try {
    const connectWhere = await resolveFolderConnect(userId, folderId)

    const entry = await prisma.journalEntry.create({
      data: {
        title,
        content,
        user:   { connect: { id: userId } },
        folder: { connect: connectWhere },
      },
    })
    return NextResponse.json(entry, { status: 201 })
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Folder not found." }, { status: 409 })
    }
    console.error(e)
    return NextResponse.json({ error: "Failed to create entry." }, { status: 500 })
  }
}

/**
 * If folderId is "root" (or empty), find the user's root (parentId: null, name: "root")
 * and return `{ id: <rootId> }`. Otherwise return `{ id: folderId }`.
 */
async function resolveFolderConnect(
  userId: string,
  folderId?: string | null
): Promise<Prisma.FolderWhereUniqueInput> {
  if (folderId && folderId !== "root") {
    return { id: folderId }
  }
  const root = await prisma.folder.findFirstOrThrow({
    where: { userId, parentId: null, name: "root" },
    select: { id: true },
  })
  return { id: root.id }
}