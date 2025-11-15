-- Add environment column to traces table if it doesn't exist
ALTER TABLE traces ADD COLUMN IF NOT EXISTS environment LowCardinality(String) DEFAULT 'default' AFTER project_id;

-- Add environment column to observations table if it doesn't exist
ALTER TABLE observations ADD COLUMN IF NOT EXISTS environment LowCardinality(String) DEFAULT 'default' AFTER project_id;

-- Add environment column to scores table if it doesn't exist
ALTER TABLE scores ADD COLUMN IF NOT EXISTS environment LowCardinality(String) DEFAULT 'default' AFTER project_id;