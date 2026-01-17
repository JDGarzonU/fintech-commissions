package com.sofka.fintech.commission_backend.application;

import com.sofka.fintech.commission_backend.domain.CommissionPolicy;
import com.sofka.fintech.commission_backend.domain.Transaction;
import com.sofka.fintech.commission_backend.infrastructure.TransactionRepository;
import com.sofka.fintech.commission_backend.infrastructure.TransactionStream;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Comparator;

@Service
public class CreateTransactionUseCase {

    private final TransactionRepository repository;
    private final TransactionStream stream;
    private final CommissionPolicy commissionPolicy = new CommissionPolicy();

    public CreateTransactionUseCase(TransactionRepository repository, TransactionStream stream) {
        this.repository = repository;
        this.stream = stream;
    }

    public Mono<TransactionResponse> execute(CreateTransactionRequest request) {
        if (request == null || request.amount() == null) {
            return Mono.error(new IllegalArgumentException("amount is required"));
        }

        var amount = request.amount();
        var commission = commissionPolicy.calculate(amount);

        Transaction tx = new Transaction(
                null,
                amount,
                commission,
                Instant.now()
        );

        return repository.save(tx)
                .map(saved -> new TransactionResponse(
                        saved.getId(),
                        saved.getAmount(),
                        saved.getCommission(),
                        saved.getCreatedAt()
                ))
                .doOnNext(stream::emit);
    }

    public Flux<TransactionResponse> listAll() {
        return repository.findAll()
                .sort(Comparator.comparing(Transaction::getCreatedAt).reversed())
                .map(tx -> new TransactionResponse(
                        tx.getId(),
                        tx.getAmount(),
                        tx.getCommission(),
                        tx.getCreatedAt()
                ));
    }

    public Mono<Long> countAll() {
        return repository.count();
    }

    public Flux<TransactionResponse> listPage(int page, int size) {
        long offset = (long) page * (long) size;
        return repository.findPage(size, offset)
                .map(tx -> new TransactionResponse(
                        tx.getId(),
                        tx.getAmount(),
                        tx.getCommission(),
                        tx.getCreatedAt()
                ));
    }
}
