-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS submission_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    input_text TEXT,
    file_path TEXT,
    metadata JSONB,
    user_ip INET,
    location_data JSONB,
    device_info TEXT,
    network_info TEXT,
    browser_info TEXT
);