package com.sofka.fintech.commission_backend.application;

import java.math.BigDecimal;

public record CreateTransactionRequest(BigDecimal amount) {}
