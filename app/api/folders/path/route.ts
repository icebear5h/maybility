import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

export async function GET(req: NextRequest) {
  const session = await auth()
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ref = req.nextUrl.searchParams.get("folderId")
  const folder = await resolveFolderRef(ref, userId)
  if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 })

  // Build ancestors: root -> ... -> parent (exclude current)
  const ancestors: Array<{ id: string; name: string; parentId: string | null; isRoot: boolean }> = []
  let node = folder
  const seen = new Set<string>()
  while (node?.parentId) {
    if (seen.has(node.parentId)) break
    seen.add(node.parentId)
    const parent = await prisma.folder.findFirst({
      where: { id: node.parentId, userId },
      select: { id: true, name: true, parentId: true, isRoot: true },
    })
    if (!parent) break
    ancestors.push(parent)
    node = parent
  }
  ancestors.reverse()

  return NextResponse.json({ folder, ancestors })
}
