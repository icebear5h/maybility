-- Migration: Add semantic space fields and branching support to JournalEntry
-- These fields enable the 3D visualization and branching timeline features

-- Add semantic coordinates for 3D space visualization
ALTER TABLE "JournalEntry" 
ADD COLUMN IF NOT EXISTS "mood" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "energy" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "clarity" DOUBLE PRECISION;

-- Add branching support for timeline feature
ALTER TABLE "JournalEntry"
ADD COLUMN IF NOT EXISTS "parentEntryId" TEXT,
ADD COLUMN IF NOT EXISTS "branchLabel" TEXT;

-- Add foreign key constraint for parent entry relationship
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'JournalEntry_parentEntryId_fkey'
  ) THEN
    ALTER TABLE "JournalEntry" 
    ADD CONSTRAINT "JournalEntry_parentEntryId_fkey" 
    FOREIGN KEY ("parentEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster branch queries
CREATE INDEX IF NOT EXISTS "JournalEntry_parentEntryId_idx" ON "JournalEntry"("parentEntryId");

-- Create index for semantic space queries
CREATE INDEX IF NOT EXISTS "JournalEntry_semantic_idx" ON "JournalEntry"("mood", "energy", "clarity");
