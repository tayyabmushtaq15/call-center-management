-- Optional per-call-center dial prefix (e.g. 7084) that the dialer API strips from the dialed number.
ALTER TABLE "callcenter"."users" ADD COLUMN "dial_prefix" VARCHAR(10);
