package com.sofka.fintech.commission_backend.presentation;

import com.sofka.fintech.commission_backend.application.CreateTransactionRequest;
import com.sofka.fintech.commission_backend.application.CreateTransactionUseCase;
import com.sofka.fintech.commission_backend.application.TransactionResponse;
import com.sofka.fintech.commission_backend.infrastructure.TransactionStream;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;

@RestController
@RequestMapping("/transactions")
public class TransactionController {

    private final CreateTransactionUseCase useCase;
    private final TransactionStream transactionStream;

    public TransactionController(CreateTransactionUseCase useCase, TransactionStream transactionStream) {
        this.useCase = useCase;
        this.transactionStream = transactionStream;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<TransactionResponse> create(@Valid @RequestBody CreateTransactionRequest body) {
        return useCase.execute(body);
    }

    @GetMapping
    public Mono<ResponseEntity<Flux<TransactionResponse>>> list(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {

        if (page == null || size == null) {
            return Mono.just(ResponseEntity.ok(useCase.listAll()));
        }

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        Mono<Long> totalMono = useCase.countAll();
        Flux<TransactionResponse> data = useCase.listPage(safePage, safeSize);

        return totalMono.map(total -> ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(total))
                .header("X-Page", String.valueOf(safePage))
                .header("X-Size", String.valueOf(safeSize))
                .body(data));
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<TransactionResponse>> stream() {

        Flux<ServerSentEvent<TransactionResponse>> data = transactionStream.stream()
                .map(tx -> ServerSentEvent.builder(tx)
                        .event("transaction")
                        .build());

        Flux<ServerSentEvent<TransactionResponse>> keepAlive = Flux.interval(Duration.ofSeconds(10))
                .map(i -> ServerSentEvent.<TransactionResponse>builder()
                        .comment("keepalive")
                        .build());

        return Flux.merge(data, keepAlive);
    }
}
