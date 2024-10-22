/*
  Warnings:

  - Added the required column `documentId` to the `DocumentChunks` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DocumentChunks" DROP CONSTRAINT "DocumentChunks_userId_fkey";

-- AlterTable
ALTER TABLE "DocumentChunks" ADD COLUMN     "documentId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "DocumentChunks" ADD CONSTRAINT "DocumentChunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DocumentChunks" ADD CONSTRAINT "DocumentChunks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
