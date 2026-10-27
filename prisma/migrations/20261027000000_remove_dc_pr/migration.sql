-- District of Columbia and Puerto Rico are not served. Remove them, but only if no DID uses them,
-- so no number is ever orphaned. Their area codes (area_code_map) are removed with them (ON DELETE CASCADE).
DELETE FROM "callcenter"."states" s
WHERE s."code" IN ('DC', 'PR')
  AND NOT EXISTS (SELECT 1 FROM "callcenter"."dids" d WHERE d."state_id" = s."id");
