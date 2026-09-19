CREATE TABLE IF NOT EXISTS group_users (
    group_uuid UUID NOT NULL
        REFERENCES groups(uuid)
        ON DELETE RESTRICT,

    user_uuid UUID NOT NULL
        REFERENCES users(uuid)
        ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (group_uuid, user_uuid)
);
