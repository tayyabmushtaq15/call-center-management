-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "callcenter";

-- CreateEnum
CREATE TYPE "callcenter"."EntityStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "callcenter"."CallLogStatus" AS ENUM ('in_progress', 'answered', 'not_answered');

-- CreateTable
CREATE TABLE "callcenter"."admin_users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Super Admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "callcenter"."states" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" VARCHAR(2) NOT NULL,
    "status" "callcenter"."EntityStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "callcenter"."area_code_map" (
    "id" SERIAL NOT NULL,
    "area_code" VARCHAR(3) NOT NULL,
    "state_id" INTEGER NOT NULL,

    CONSTRAINT "area_code_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "callcenter"."switches" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "switch_type" TEXT NOT NULL,
    "switch_url" TEXT NOT NULL,
    "switch_port" INTEGER NOT NULL,
    "auth_token" TEXT NOT NULL,
    "webhook_secret" TEXT NOT NULL,
    "status" "callcenter"."EntityStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "switches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "callcenter"."users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "switch_id" INTEGER,
    "status" "callcenter"."EntityStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "callcenter"."user_state_assignments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "state_id" INTEGER NOT NULL,
    "did_count" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_state_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "callcenter"."api_keys" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "status" "callcenter"."EntityStatus" NOT NULL DEFAULT 'active',
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "callcenter"."dids" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "area_code" VARCHAR(3) NOT NULL,
    "state_id" INTEGER NOT NULL,
    "status" "callcenter"."EntityStatus" NOT NULL DEFAULT 'active',
    "is_in_use" BOOLEAN NOT NULL DEFAULT false,
    "assigned_to" INTEGER,
    "assigned_at" TIMESTAMP(3),
    "total_uses" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "callcenter"."call_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "did_id" INTEGER NOT NULL,
    "switch_id" INTEGER NOT NULL,
    "receiver_number" TEXT NOT NULL,
    "receiver_state" VARCHAR(2) NOT NULL,
    "call_status" "callcenter"."CallLogStatus" NOT NULL DEFAULT 'in_progress',
    "duration" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "callcenter"."system_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "system_name" TEXT NOT NULL DEFAULT 'Local Presence Dialing',
    "low_pool_warning_threshold" INTEGER NOT NULL DEFAULT 5,
    "api_rate_limit_per_minute" INTEGER NOT NULL DEFAULT 120,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "callcenter"."admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "states_code_key" ON "callcenter"."states"("code");

-- CreateIndex
CREATE UNIQUE INDEX "area_code_map_area_code_key" ON "callcenter"."area_code_map"("area_code");

-- CreateIndex
CREATE INDEX "area_code_map_state_id_idx" ON "callcenter"."area_code_map"("state_id");

-- CreateIndex
CREATE UNIQUE INDEX "switches_webhook_secret_key" ON "callcenter"."switches"("webhook_secret");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "callcenter"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_state_assignments_user_id_state_id_key" ON "callcenter"."user_state_assignments"("user_id", "state_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "callcenter"."api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_user_id_idx" ON "callcenter"."api_keys"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "dids_number_key" ON "callcenter"."dids"("number");

-- CreateIndex
CREATE INDEX "dids_state_id_assigned_to_status_is_in_use_total_uses_idx" ON "callcenter"."dids"("state_id", "assigned_to", "status", "is_in_use", "total_uses");

-- CreateIndex
CREATE INDEX "call_logs_user_id_started_at_idx" ON "callcenter"."call_logs"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "call_logs_switch_id_idx" ON "callcenter"."call_logs"("switch_id");

-- AddForeignKey
ALTER TABLE "callcenter"."area_code_map" ADD CONSTRAINT "area_code_map_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "callcenter"."states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "callcenter"."users" ADD CONSTRAINT "users_switch_id_fkey" FOREIGN KEY ("switch_id") REFERENCES "callcenter"."switches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "callcenter"."user_state_assignments" ADD CONSTRAINT "user_state_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "callcenter"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "callcenter"."user_state_assignments" ADD CONSTRAINT "user_state_assignments_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "callcenter"."states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "callcenter"."api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "callcenter"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "callcenter"."dids" ADD CONSTRAINT "dids_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "callcenter"."states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "callcenter"."dids" ADD CONSTRAINT "dids_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "callcenter"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "callcenter"."call_logs" ADD CONSTRAINT "call_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "callcenter"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "callcenter"."call_logs" ADD CONSTRAINT "call_logs_did_id_fkey" FOREIGN KEY ("did_id") REFERENCES "callcenter"."dids"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "callcenter"."call_logs" ADD CONSTRAINT "call_logs_switch_id_fkey" FOREIGN KEY ("switch_id") REFERENCES "callcenter"."switches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
