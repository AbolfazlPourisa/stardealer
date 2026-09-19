CREATE TABLE IF NOT EXISTS users (
    uuid UUID PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    
    username VARCHAR(32),
    first_name VARCHAR(64),

    stars BIGINT NOT NULL,

    last_stars_claimed_at TIMESTAMPTZ NOT NULL
        DEFAULT (NOW() - INTERVAL '24 hours'),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
