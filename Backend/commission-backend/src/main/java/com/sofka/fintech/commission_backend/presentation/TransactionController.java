package com.sofka.fintech.commission_backend.presentation;

import com.sofka.fintech.commission_backend.application.CreateTransactionRequest;
import com.sofka.fintech.commission_backend.application.CreateTransactionUseCase;
import com.sofka.fintech.commission_backend.application.TransactionResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/transactions")
public class TransactionController {

    private final CreateTransactionUseCase useCase;

    public TransactionController(CreateTransactionUseCase useCase) {
        this.useCase = useCase;
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
}
