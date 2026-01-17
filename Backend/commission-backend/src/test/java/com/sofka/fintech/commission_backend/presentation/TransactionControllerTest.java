package com.sofka.fintech.commission_backend.presentation;

import com.sofka.fintech.commission_backend.application.CreateTransactionRequest;
import com.sofka.fintech.commission_backend.application.TransactionResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class TransactionControllerTest {

    @Autowired
    WebTestClient webTestClient;

    @Test
    void should_create_transaction() {
        webTestClient.post()
                .uri("/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(new CreateTransactionRequest(new java.math.BigDecimal("15000")))
                .exchange()
                .expectStatus().isCreated()
                .expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_JSON)
                .expectBody(TransactionResponse.class)
                .value(res -> {
                    assertThat(res.id()).isNotNull();
                    assertThat(res.amount()).isEqualByComparingTo("15000");
                    assertThat(res.commission()).isNotNull();
                    assertThat(res.createdAt()).isNotNull();
                });
    }

    @Test
    void should_return_400_when_amount_missing() {
        webTestClient.post()
                .uri("/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue("{}")
                .exchange()
                .expectStatus().isBadRequest()
                .expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_JSON)
                .expectBody()
                .jsonPath("$.status").isEqualTo(400)
                .jsonPath("$.error").exists()
                .jsonPath("$.path").isEqualTo("/transactions");
    }

    @Test
    void should_list_transactions() {
        webTestClient.post()
                .uri("/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(new CreateTransactionRequest(new java.math.BigDecimal("12000")))
                .exchange()
                .expectStatus().isCreated();

        webTestClient.get()
                .uri("/transactions")
                .exchange()
                .expectStatus().isOk()
                .expectBodyList(TransactionResponse.class)
                .value(list -> assertThat(list.size()).isGreaterThanOrEqualTo(1));
    }

    @Test
    void sse_stream_should_emit_on_create() {
        Flux<TransactionResponse> stream = webTestClient.get()
                .uri("/transactions/stream")
                .accept(MediaType.TEXT_EVENT_STREAM)
                .exchange()
                .expectStatus().isOk()
                .returnResult(TransactionResponse.class)
                .getResponseBody();

        webTestClient.post()
                .uri("/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(new CreateTransactionRequest(new java.math.BigDecimal("9999")))
                .exchange()
                .expectStatus().isCreated();

        TransactionResponse next = stream
                .filter(ev -> ev != null && ev.amount() != null && ev.amount().compareTo(new java.math.BigDecimal("9999")) == 0)
                .next() // Mono<TransactionResponse>
                .timeout(Duration.ofSeconds(3))
                .block();

        assertThat(next).isNotNull();
        assertThat(next.id()).isNotNull();
        assertThat(next.amount()).isEqualByComparingTo("9999");
    }
}
