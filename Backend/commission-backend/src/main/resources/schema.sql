CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY,
    amount DECIMAL(19,2) NOT NULL,
    commission DECIMAL(19,2) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

