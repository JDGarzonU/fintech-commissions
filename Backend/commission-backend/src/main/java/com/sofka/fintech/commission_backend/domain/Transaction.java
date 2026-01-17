package com.sofka.fintech.commission_backend.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Table("transactions")
public class Transaction {

    @Id
    private Long id;

    private BigDecimal amount;
    private BigDecimal commission;

    @Column("created_at")
    private Instant createdAt;

    public Transaction() {}

    public Transaction(Long id, BigDecimal amount, BigDecimal commission, Instant createdAt) {
        this.id = id;
        this.amount = amount;
        this.commission = commission;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public BigDecimal getCommission() { return commission; }
    public void setCommission(BigDecimal commission) { this.commission = commission; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
