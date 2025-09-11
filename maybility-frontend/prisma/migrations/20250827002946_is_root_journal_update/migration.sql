/*
  Warnings:

  - A unique constraint covering the columns `[userId,parentId,name]` on the table `folders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."folders" ADD COLUMN     "isRoot" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "folders_userId_idx" ON "public"."folders"("userId");

-- CreateIndex
CREATE INDEX "folders_parentId_idx" ON "public"."folders"("parentId");

-- CreateIndex
CREATE INDEX "folders_userId_parentId_idx" ON "public"."folders"("userId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "folders_userId_parentId_name_key" ON "public"."folders"("userId", "parentId", "name");

-- CreateIndex
CREATE INDEX "journal_entries_userId_idx" ON "public"."journal_entries"("userId");

-- CreateIndex
CREATE INDEX "journal_entries_folderId_idx" ON "public"."journal_entries"("folderId");

-- CreateIndex
CREATE INDEX "journal_entries_userId_folderId_idx" ON "public"."journal_entries"("userId", "folderId");
