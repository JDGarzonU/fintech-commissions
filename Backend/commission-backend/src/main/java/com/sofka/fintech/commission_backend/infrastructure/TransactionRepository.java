package com.sofka.fintech.commission_backend.infrastructure;

import com.sofka.fintech.commission_backend.domain.Transaction;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;

public interface TransactionRepository extends ReactiveCrudRepository<Transaction, Long> {}

