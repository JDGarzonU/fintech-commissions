package com.sofka.fintech.commission_backend.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;

public class CommissionPolicy {

    private static final BigDecimal THRESHOLD = new BigDecimal("10000.00");
    private static final BigDecimal RATE_LOW = new BigDecimal("0.02");
    private static final BigDecimal RATE_HIGH = new BigDecimal("0.05");

    public BigDecimal calculate(BigDecimal amount) {
        if (amount == null) throw new IllegalArgumentException("amount is required");
        if (amount.compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("amount must be greater than 0");

        BigDecimal rate = amount.compareTo(THRESHOLD) > 0 ? RATE_HIGH : RATE_LOW;

        // 2 decimales por ser dinero
        return amount.multiply(rate).setScale(2, RoundingMode.HALF_UP);
    }
}
