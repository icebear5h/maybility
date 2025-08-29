import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getFolderRef(req: NextRequest): string | null {
  const v = req.nextUrl.searchParams.get("folderId")
  return v && v.trim() ? v : null // null => treat as root
}

export async function GET(req: NextRequest) {
  const session = await auth()
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ref = getFolderRef(req) // "root" | id | null
  const search = req.nextUrl.searchParams.get("search")?.trim() || ""

  const folder = await resolveFolderRef(ref, userId) // see below
  if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 })

  const folders = await prisma.folder.findMany({
    where: { userId, parentId: folder.id },
    orderBy: { name: "asc" },
  })

  const entries = await prisma.journalEntry.findMany({
    where: {
      userId,
      folderId: folder.id,
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json({ folder, folders, entries })
}

async function resolveFolderRef(ref: string | null, userId: string) {
  if (!ref || ref === "root") {
    return prisma.folder.findFirst({
      where: { userId, isRoot: true },
      select: { id: true, name: true, parentId: true, isRoot: true },
    })
  }
  return prisma.folder.findFirst({
    where: { id: ref, userId },
    select: { id: true, name: true, parentId: true, isRoot: true },
  })
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    let name = (body?.name ?? "").trim()
    const rawFolderId = (body?.folderId as string | null | undefined) ?? "root"

    // Resolve parent: "root" or id -> concrete folder row owned by user
    const parent = await resolveFolderRef(rawFolderId, userId)
    if (!parent) return NextResponse.json({ error: "Parent folder not found" }, { status: 404 })

    // Default/unique name
    if (!name) {
      name = await generateUniqueFolderName(userId, parent.id, "New Folder")
    }

    const folder = await prisma.folder.create({
      data: { name, parentId: parent.id, userId },
      select: { id: true, name: true, parentId: true, createdAt: true, updatedAt: true },
    })

    return NextResponse.json({ folder }, { status: 201 })
  } catch (error) {
    console.error("Error creating folder:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


async function generateUniqueFolderName(userId: string, parentId: string | null, baseName: string) {
  const siblings = await prisma.folder.findMany({
    where: { userId, parentId },
    select: { name: true },
  })
  const taken = new Set(siblings.map((s) => s.name))
  if (!taken.has(baseName)) return baseName

  let counter = 2
  while (taken.has(`${baseName} (${counter})`)) {
    counter++
  }
  return `${baseName} (${counter})`
}