package com.sofka.fintech.commission_backend.application;

import java.math.BigDecimal;
import java.time.Instant;

public record TransactionResponse(Long id, BigDecimal amount, BigDecimal commission, Instant createdAt) {}
