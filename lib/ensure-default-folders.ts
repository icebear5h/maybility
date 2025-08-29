// lib/ensure-defaults.ts
import { prisma } from "@/lib/prisma"

/**
 * Ensures the user has:
 * - Root (parentId = null, name = "root")
 * - Journal (child of Root)
 * - Personal Manual (child of Root)
 * Returns the IDs so callers can use them.
 */
export async function ensureUserDefaultFolders(userId: string) {
  // Root
  const root = await prisma.folder.upsert({
    where: {
      // relies on @@unique([userId, parentId, name])
      userId_parentId_name: { userId, parentId: "root", name: "root" },
    },
    update: {},
    create: { userId, parentId: null, name: "root", isRoot: true },
    select: { id: true },
  })

  // Children under root
  const [journal, personal] = await Promise.all([
    prisma.folder.upsert({
      where: {
        userId_parentId_name: { userId, parentId: root.id, name: "Journal" },
      },
      update: {},
      create: { userId, parentId: root.id, name: "Journal" },
      select: { id: true },
    }),
    prisma.folder.upsert({
      where: {
        userId_parentId_name: { userId, parentId: root.id, name: "Personal Manual" },
      },
      update: {},
      create: { userId, parentId: root.id, name: "Personal Manual" },
      select: { id: true },
    }),
  ])

  return { rootId: root.id, journalId: journal.id, personalManualId: personal.id }
}