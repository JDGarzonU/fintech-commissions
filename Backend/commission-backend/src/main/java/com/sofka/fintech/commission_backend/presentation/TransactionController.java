package com.sofka.fintech.commission_backend.presentation;

import com.sofka.fintech.commission_backend.application.CreateTransactionRequest;
import com.sofka.fintech.commission_backend.application.CreateTransactionUseCase;
import com.sofka.fintech.commission_backend.application.TransactionResponse;
import com.sofka.fintech.commission_backend.infrastructure.TransactionStream;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

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
    public Mono<TransactionResponse> create(@RequestBody Mono<CreateTransactionRequest> body) {
        return body.flatMap(useCase::execute);
    }

    @GetMapping
    public Flux<TransactionResponse> list() {
        return useCase.listAll();
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<TransactionResponse> stream() {
        return transactionStream.stream();
    }
}
