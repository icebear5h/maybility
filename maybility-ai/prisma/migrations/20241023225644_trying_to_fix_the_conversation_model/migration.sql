/*
  Warnings:

  - Added the required column `title` to the `Conversation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "title" TEXT NOT NULL;
