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
        BigDecimal commission = policy.calculate(new BigDecimal("10001.00"));
        assertEquals(new BigDecimal("500.05"), commission);
    }

    @Test
    void should_reject_null_or_non_positive_amount() {
        CommissionPolicy policy = new CommissionPolicy();
        assertThrows(IllegalArgumentException.class, () -> policy.calculate(null));
        assertThrows(IllegalArgumentException.class, () -> policy.calculate(new BigDecimal("0")));
        assertThrows(IllegalArgumentException.class, () -> policy.calculate(new BigDecimal("-1")));
    }

    @Test
    void should_apply_2_percent_when_amount_is_exactly_10000() {
        CommissionPolicy policy = new CommissionPolicy();
        BigDecimal commission = policy.calculate(new BigDecimal("10000.00"));
        assertEquals(new BigDecimal("200.00"), commission);
    }

    @Test
    void should_round_half_up_to_2_decimals() {
        CommissionPolicy policy = new CommissionPolicy();
        // 10000.10 * 0.05 = 500.005 -> HALF_UP => 500.01
        BigDecimal commission = policy.calculate(new BigDecimal("10000.10"));
        assertEquals(new BigDecimal("500.01"), commission);
    }
}
