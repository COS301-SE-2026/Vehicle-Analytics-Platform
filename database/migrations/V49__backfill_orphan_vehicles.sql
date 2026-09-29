
-- V43: Backfill orphaned vehicles into Gauteng Group


UPDATE vehicles
   SET fleet_group_id = 3
 WHERE fleet_group_id IS NULL;
