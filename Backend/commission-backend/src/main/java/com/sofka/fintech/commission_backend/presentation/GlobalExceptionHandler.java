package com.sofka.fintech.commission_backend.presentation;

import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.support.WebExchangeBindException;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebExceptionHandler;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;

import static org.springframework.core.Ordered.HIGHEST_PRECEDENCE;

@Component
@Order(HIGHEST_PRECEDENCE)
public class GlobalExceptionHandler implements WebExceptionHandler {

    private final JsonWriter jsonWriter;

    public GlobalExceptionHandler(JsonWriter jsonWriter) {
        this.jsonWriter = jsonWriter;
    }

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        if (exchange.getResponse().isCommitted()) return Mono.error(ex);

        if (ex instanceof WebExchangeBindException bindEx) {
            return writeValidationError(exchange, bindEx);
        }

        if (ex instanceof IllegalArgumentException iae) {
            return writeSimpleError(exchange, HttpStatus.BAD_REQUEST, iae.getMessage());
        }

        return writeSimpleError(exchange, HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error");
    }

    private Mono<Void> writeValidationError(ServerWebExchange exchange, WebExchangeBindException ex) {
        var status = HttpStatus.BAD_REQUEST;

        List<ErrorResponse.FieldError> details = ex.getBindingResult().getFieldErrors().stream()
                .map(this::toFieldError)
                .toList();

        ErrorResponse body = new ErrorResponse(
                Instant.now(),
                status.value(),
                "Validation error",
                exchange.getRequest().getPath().value(),
                details
        );

        return jsonWriter.write(exchange, status, body);
    }

    private ErrorResponse.FieldError toFieldError(FieldError fe) {
        return new ErrorResponse.FieldError(fe.getField(), fe.getDefaultMessage());
    }

    private Mono<Void> writeSimpleError(ServerWebExchange exchange, HttpStatus status, String message) {
        ErrorResponse body = new ErrorResponse(
                Instant.now(),
                status.value(),
                message,
                exchange.getRequest().getPath().value(),
                List.of()
        );

        return jsonWriter.write(exchange, status, body);
    }
}
