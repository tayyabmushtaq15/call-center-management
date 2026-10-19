-- Shared-pool dialer API: faster free-DID lookup, safer defaults for 100-200 concurrent calls.

-- CreateIndex
CREATE INDEX "dids_state_id_status_total_uses_id_idx" ON "callcenter"."dids"("state_id", "status", "total_uses", "id");

-- A lease shorter than the longest call would hand a DID out again mid-call.
ALTER TABLE "callcenter"."users" ALTER COLUMN "lease_seconds" SET DEFAULT 3600;
UPDATE "callcenter"."users" SET "lease_seconds" = 3600 WHERE "lease_seconds" = 180;

-- 120 requests/minute per key would throttle a call center running 100-200 simultaneous calls.
ALTER TABLE "callcenter"."system_settings" ALTER COLUMN "api_rate_limit_per_minute" SET DEFAULT 6000;
UPDATE "callcenter"."system_settings" SET "api_rate_limit_per_minute" = 6000 WHERE "api_rate_limit_per_minute" = 120;
