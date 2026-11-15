ALTER TABLE branches ADD COLUMN IF NOT EXISTS custom_time_slots JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE branches 
SET custom_time_slots = '["08:30", "10:00", "14:00", "16:00", "18:00", "19:30"]'::jsonb
WHERE id = 'aaaaaaaa-0001-0001-0001-000000000001';

