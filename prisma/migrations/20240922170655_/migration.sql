-- CreateEnum
CREATE TYPE "Speaker" AS ENUM ('user', 'ai');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "metadata" JSONB;


-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "entry" TEXT,
    "speaker" "Speaker" NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Conversation"
ADD CONSTRAINT "Conversation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
