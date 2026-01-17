package com.sofka.fintech.commission_backend.presentation;

import java.time.Instant;
import java.util.List;

public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String path,
        List<FieldError> details
) {
    public record FieldError(String field, String message) {}
}
