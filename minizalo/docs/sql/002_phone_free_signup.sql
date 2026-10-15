-- OPTIONAL PROPOSAL: shared database owner must approve with all backend owners.
-- Native apps/admin must handle null phone before enabling Mini App signup.
-- Retains the existing UNIQUE phone constraint and all existing phone values.
BEGIN;
ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL;
COMMIT;
-- No automatic rollback: adding NOT NULL fails after phone-free users exist.
