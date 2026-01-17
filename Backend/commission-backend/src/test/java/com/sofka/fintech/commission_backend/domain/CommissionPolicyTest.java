package com.sofka.fintech.commission_backend.domain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class CommissionPolicyTest {

    @Test
    void should_apply_2_percent_when_amount_is_10000_or_less() {
        CommissionPolicy policy = new CommissionPolicy();
        BigDecimal commission = policy.calculate(new BigDecimal("10000.00"));
        assertEquals(new BigDecimal("200.00"), commission);
    }

    @Test
    void should_apply_5_percent_when_amount_is_greater_than_10000() {
        CommissionPolicy policy = new CommissionPolicy();
        BigDecimal commission = policy.calculate(new BigDecimal("10000.01"));
        assertEquals(new BigDecimal("500.00"), commission);
    }

    @Test
    void should_reject_null_or_non_positive_amount() {
        CommissionPolicy policy = new CommissionPolicy();
        assertThrows(IllegalArgumentException.class, () -> policy.calculate(null));
        assertThrows(IllegalArgumentException.class, () -> policy.calculate(new BigDecimal("0")));
        assertThrows(IllegalArgumentException.class, () -> policy.calculate(new BigDecimal("-1")));
    }
}
