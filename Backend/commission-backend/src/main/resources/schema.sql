DROP TABLE IF EXISTS transactions;

CREATE TABLE transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(19,2) NOT NULL,
    commission DECIMAL(19,2) NOT NULL,
    created_at TIMESTAMP NOT NULL
);
