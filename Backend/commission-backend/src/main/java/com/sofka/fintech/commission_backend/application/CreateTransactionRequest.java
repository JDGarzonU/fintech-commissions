package com.sofka.fintech.commission_backend.application;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CreateTransactionRequest(
        @NotNull(message = "amount is required")
        @DecimalMin(value = "0.01", message = "amount must be greater than 0")
        @Digits(integer = 17, fraction = 2, message = "amount is too large or has more than 2 decimal places")
        BigDecimal amount
) {}
