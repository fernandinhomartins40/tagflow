-- Migration: Add thumbnail fields to products, services, and locations
-- Date: 2026-02-12

-- Add thumbnail columns to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS image_url_medium TEXT,
ADD COLUMN IF NOT EXISTS image_url_small TEXT;

-- Add thumbnail columns to services table
ALTER TABLE services
ADD COLUMN IF NOT EXISTS image_url_medium TEXT,
ADD COLUMN IF NOT EXISTS image_url_small TEXT;

-- Add thumbnail columns to locations table
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS image_url_medium TEXT,
ADD COLUMN IF NOT EXISTS image_url_small TEXT;

-- Add comments for documentation
COMMENT ON COLUMN products.image_url_medium IS 'Medium resolution thumbnail (256x256) generated from uploaded image';
COMMENT ON COLUMN products.image_url_small IS 'Small resolution thumbnail (128x128) generated from uploaded image';

COMMENT ON COLUMN services.image_url_medium IS 'Medium resolution thumbnail (256x256) generated from uploaded image';
COMMENT ON COLUMN services.image_url_small IS 'Small resolution thumbnail (128x128) generated from uploaded image';

COMMENT ON COLUMN locations.image_url_medium IS 'Medium resolution thumbnail (256x256) generated from uploaded image';
COMMENT ON COLUMN locations.image_url_small IS 'Small resolution thumbnail (128x128) generated from uploaded image';
