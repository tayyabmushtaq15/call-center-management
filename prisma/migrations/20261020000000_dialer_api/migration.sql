-- Dialer API (GET /api/v1/did): IP whitelist, DID leases, request log.
-- Additive only: no existing column is dropped or retyped.

-- AlterEnum
ALTER TYPE "callcenter"."CallLogStatus" ADD VALUE IF NOT EXISTS 'unknown';

-- AlterTable
ALTER TABLE "callcenter"."users" ADD COLUMN "lease_seconds" INTEGER NOT NULL DEFAULT 180;

-- AlterTable
ALTER TABLE "callcenter"."dids" ADD COLUMN "lease_expires_at" TIMESTAMP(3);

-- AlterTable (dialer-flow calls have no switch)
ALTER TABLE "callcenter"."call_logs" ALTER COLUMN "switch_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "callcenter"."allowed_ips" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "ip" TEXT NOT NULL,
    "label" TEXT,
    "status" "callcenter"."EntityStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allowed_ips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "callcenter"."did_request_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "kind" VARCHAR(10) NOT NULL,
    "ip" TEXT NOT NULL,
    "destination" TEXT,
    "did_number" TEXT,
    "outcome" VARCHAR(10) NOT NULL,
    "reason" TEXT,
    "latency_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "did_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allowed_ips_user_id_ip_key" ON "callcenter"."allowed_ips"("user_id", "ip");

-- CreateIndex
CREATE INDEX "did_request_logs_user_id_created_at_idx" ON "callcenter"."did_request_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "did_request_logs_created_at_idx" ON "callcenter"."did_request_logs"("created_at");

-- AddForeignKey
ALTER TABLE "callcenter"."allowed_ips" ADD CONSTRAINT "allowed_ips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "callcenter"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "callcenter"."did_request_logs" ADD CONSTRAINT "did_request_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "callcenter"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
