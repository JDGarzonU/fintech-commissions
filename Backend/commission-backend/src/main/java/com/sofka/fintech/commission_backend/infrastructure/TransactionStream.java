package com.sofka.fintech.commission_backend.infrastructure;

import com.sofka.fintech.commission_backend.application.TransactionResponse;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

@Component
public class TransactionStream {

    private final Sinks.Many<TransactionResponse> sink =
            Sinks.many().multicast().onBackpressureBuffer();

    public void emit(TransactionResponse tx) {
        sink.tryEmitNext(tx);
    }

    public Flux<TransactionResponse> stream() {
        return sink.asFlux();
    }
}
