ALTER TABLE scores ADD COLUMN IF NOT EXISTS dataset_run_id Nullable(String) AFTER session_id SETTINGS mutations_sync = 2;
