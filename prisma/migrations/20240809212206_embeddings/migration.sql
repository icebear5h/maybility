CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE "Document" ADD COLUMN "embedding" vector;
