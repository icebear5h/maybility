/*
  Warnings:

  - You are about to drop the column `documentId` on the `DocumentChunks` table. All the data in the column will be lost.
  - Added the required column `userId` to the `DocumentChunks` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DocumentChunks" DROP CONSTRAINT "DocumentChunks_documentId_fkey";

-- AlterTable
ALTER TABLE "DocumentChunks" DROP COLUMN "documentId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "DocumentChunks" ADD CONSTRAINT "DocumentChunks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
