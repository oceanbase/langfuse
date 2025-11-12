ALTER TABLE scores ON CLUSTER default ADD COLUMN IF NOT EXISTS dataset_run_id Nullable(String) AFTER session_id SETTINGS mutations_sync = 2;
