-- Phase 7.3 — Store invite token hash only (legacy plain values remain valid via lookup fallback)

ALTER TABLE "organization_invites" RENAME COLUMN "token" TO "tokenHash";

DROP INDEX IF EXISTS "organization_invites_token_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "organization_invites_tokenHash_key" ON "organization_invites"("tokenHash");
