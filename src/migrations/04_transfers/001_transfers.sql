CREATE TABLE IF NOT EXISTS transfers (
    uuid UUID PRIMARY KEY,
    
    transmitter_uuid UUID NOT NULL
        REFERENCES users(uuid)
        ON DELETE RESTRICT,

    receiver_uuid UUID NOT NULL
        REFERENCES users(uuid)
        ON DELETE RESTRICT,

    amount BIGINT NOT NULL
        CHECK (amount > 0),

    transfer_status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (transfer_status IN (
            'pending',
            'canceled',
            'finished'
        )),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
