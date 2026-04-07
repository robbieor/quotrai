
-- Enable trigram extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add MPN to supplier_sources
ALTER TABLE supplier_sources ADD COLUMN IF NOT EXISTS manufacturer_part_number TEXT;
CREATE INDEX IF NOT EXISTS idx_supplier_sources_mpn ON supplier_sources(manufacturer_part_number);
CREATE INDEX IF NOT EXISTS idx_supplier_sources_product_name_trgm ON supplier_sources USING GIN (product_name gin_trgm_ops);

-- Add MPN to team_catalog_items
ALTER TABLE team_catalog_items ADD COLUMN IF NOT EXISTS manufacturer_part_number TEXT;
CREATE INDEX IF NOT EXISTS idx_team_catalog_mpn ON team_catalog_items(manufacturer_part_number);
