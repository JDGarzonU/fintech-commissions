package com.sofka.fintech.commission_backend.infrastructure;

import com.sofka.fintech.commission_backend.domain.Transaction;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface TransactionRepository extends ReactiveCrudRepository<Transaction, Long> {

    @Query("""
        SELECT id, amount, commission, created_at
        FROM transactions
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """)
    Flux<Transaction> findPage(@Param("limit") int limit, @Param("offset") long offset);
}
