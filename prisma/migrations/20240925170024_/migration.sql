/*
  Warnings:

  - You are about to drop the column `embedding` on the `Document` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "embedding";

-- CreateTable
CREATE TABLE "DocumentChunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "embedding" vector NOT NULL,

    CONSTRAINT "DocumentChunks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DocumentChunks" ADD CONSTRAINT "DocumentChunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
