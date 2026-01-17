package com.sofka.fintech.commission_backend.application;

import com.sofka.fintech.commission_backend.domain.Transaction;
import com.sofka.fintech.commission_backend.infrastructure.TransactionRepository;
import com.sofka.fintech.commission_backend.infrastructure.TransactionStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreateTransactionUseCaseTest {

    @Mock
    TransactionRepository repository;

    @Mock
    TransactionStream stream;

    @InjectMocks
    CreateTransactionUseCase useCase;

    @Test
    void execute_should_apply_5_percent_when_amount_greater_than_10000() {
        BigDecimal amount = new BigDecimal("15000");
        BigDecimal expectedCommission = new BigDecimal("750.00");

        Transaction savedTx = new Transaction(
                1L,
                amount,
                expectedCommission,
                Instant.parse("2026-01-01T00:00:00Z")
        );

        when(repository.save(any(Transaction.class))).thenReturn(Mono.just(savedTx));

        // when
        Mono<TransactionResponse> result = useCase.execute(new CreateTransactionRequest(amount));

        // then
        StepVerifier.create(result)
                .assertNext(res -> {
                    assertThat(res.id()).isEqualTo(1L);
                    assertThat(res.amount()).isEqualByComparingTo("15000");
                    assertThat(res.commission()).isEqualByComparingTo("750.00");
                    assertThat(res.createdAt()).isNotNull();
                })
                .verifyComplete();

        ArgumentCaptor<Transaction> txCaptor = ArgumentCaptor.forClass(Transaction.class);
        verify(repository).save(txCaptor.capture());
        Transaction toSave = txCaptor.getValue();

        assertThat(toSave.getId()).isNull(); // autoincrement
        assertThat(toSave.getAmount()).isEqualByComparingTo("15000");
        assertThat(toSave.getCommission()).isEqualByComparingTo("750.00");
        assertThat(toSave.getCreatedAt()).isNotNull();

        verify(stream).emit(any(TransactionResponse.class));
        verifyNoMoreInteractions(stream);
    }

    @Test
    void execute_should_apply_2_percent_when_amount_is_10000_or_less() {
        BigDecimal amount = new BigDecimal("10000");
        BigDecimal expectedCommission = new BigDecimal("200.00");

        Transaction savedTx = new Transaction(
                2L,
                amount,
                expectedCommission,
                Instant.parse("2026-01-01T00:00:00Z")
        );

        when(repository.save(any(Transaction.class))).thenReturn(Mono.just(savedTx));

        // when
        Mono<TransactionResponse> result = useCase.execute(new CreateTransactionRequest(amount));

        // then
        StepVerifier.create(result)
                .assertNext(res -> {
                    assertThat(res.id()).isEqualTo(2L);
                    assertThat(res.amount()).isEqualByComparingTo("10000");
                    assertThat(res.commission()).isEqualByComparingTo("200.00");
                })
                .verifyComplete();

        ArgumentCaptor<Transaction> txCaptor = ArgumentCaptor.forClass(Transaction.class);
        verify(repository).save(txCaptor.capture());
        Transaction toSave = txCaptor.getValue();

        assertThat(toSave.getCommission()).isEqualByComparingTo("200.00");
        verify(stream).emit(any(TransactionResponse.class));
    }

    @Test
    void execute_should_error_when_amount_missing() {
        StepVerifier.create(useCase.execute(new CreateTransactionRequest(null)))
                .expectErrorMatches(ex ->
                        ex instanceof IllegalArgumentException &&
                                ex.getMessage().equals("amount is required")
                )
                .verify();

        verifyNoInteractions(repository);
        verifyNoInteractions(stream);
    }
}
