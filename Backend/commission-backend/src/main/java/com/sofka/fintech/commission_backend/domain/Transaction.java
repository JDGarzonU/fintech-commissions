package com.sofka.fintech.commission_backend.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class Transaction {
    private final UUID id;
    private final BigDecimal amount;
    private final BigDecimal commission;
    private final Instant createdAt;

    public Transaction(UUID id, BigDecimal amount, BigDecimal commission, Instant createdAt) {
        this.id = id;
        this.amount = amount;
        this.commission = commission;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public BigDecimal getAmount() { return amount; }
    public BigDecimal getCommission() { return commission; }
    public Instant getCreatedAt() { return createdAt; }
}
