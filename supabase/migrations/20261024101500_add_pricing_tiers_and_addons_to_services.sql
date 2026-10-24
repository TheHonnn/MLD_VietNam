-- Add pricing_tiers and add_on_items to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS pricing_tiers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS add_on_items JSONB DEFAULT '[]'::jsonb;
