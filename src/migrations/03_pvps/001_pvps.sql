CREATE TABLE IF NOT EXISTS pvps (
    uuid UUID PRIMARY KEY,
    
    creator_uuid UUID NOT NULL
        REFERENCES users(uuid)
        ON DELETE RESTRICT,

    acceptor_uuid UUID
        REFERENCES users(uuid)
        ON DELETE RESTRICT,

    amount BIGINT NOT NULL
        CHECK (amount > 0),

    pvp_status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (pvp_status IN (
            'pending',
            'canceled',
            'finished'
        )),

    winner_uuid UUID
        REFERENCES users(uuid)
        ON DELETE RESTRICT,

    loser_uuid UUID
        REFERENCES users(uuid)
        ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
