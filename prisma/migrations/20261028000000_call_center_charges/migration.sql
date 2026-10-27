-- What a call center is charged: per call, and extra per attended (answered) call.
ALTER TABLE "callcenter"."users" ADD COLUMN "charge_per_call" DECIMAL(10,4) NOT NULL DEFAULT 0;
ALTER TABLE "callcenter"."users" ADD COLUMN "charge_per_attended" DECIMAL(10,4) NOT NULL DEFAULT 0;
