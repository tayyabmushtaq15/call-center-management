-- Settings switch: show the "free the DID at hangup" line on call center pages. Off by default.
ALTER TABLE "callcenter"."system_settings" ADD COLUMN "show_hangup_line" BOOLEAN NOT NULL DEFAULT false;
