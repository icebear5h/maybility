import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface UpdateFolderData {
    name?: string
    parentId?: string
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; folderId: string }> },
) {
  try {

    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId, folderId } = await params
    const { name, parentId } = await req.json()

    // Verify folder belongs to project
    const existingFolder = await prisma.folder.findFirst({
      where: { id: folderId },
    })

    if (!existingFolder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    // If changing parent, verify new parent belongs to same project
    if (parentId && parentId !== "root") {
      const parentFolder = await prisma.folder.findFirst({
        where: { id: parentId },
      })
      if (!parentFolder) {
        return NextResponse.json({ error: "Parent folder not found in project" }, { status: 400 })
      }
    }

    const folder = await prisma.folder.update({
      where: { id: folderId },
      data: {
        name,
        parentId: parentId === "root" ? null : parentId,
      },
    })

    return NextResponse.json({ folder })
  } catch (error) {
    console.error("Error updating folder:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  ctx: { params?: { id?: string } }
) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const id = ctx?.params?.id
    if (!id) return NextResponse.json({ error: "Missing folder id" }, { status: 400 })

    // Make sure the folder exists and belongs to the user
    const folder = await prisma.folder.findFirst({
      where: { id, userId },
      select: { id: true, isRoot: true },
    })
    if (!folder) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (folder.isRoot) {
      return NextResponse.json({ error: "Cannot delete root folder" }, { status: 400 })
    }

    // Delete by unique id (don’t include userId in delete’s where)
    await prisma.folder.delete({ where: { id: folder.id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error("DELETE /api/folders/[id] failed:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}