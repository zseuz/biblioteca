package com.biblioteca.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.biblioteca.domain.Book;
import com.biblioteca.domain.Member;
import com.biblioteca.dto.LoanRequest;
import com.biblioteca.exception.BusinessRuleException;
import com.biblioteca.repository.BookRepository;
import com.biblioteca.repository.LoanRepository;
import com.biblioteca.repository.MemberRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.RepeatedTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.OptimisticLockingFailureException;

/**
 * Concurrencia real (hilos + transacciones + H2) sobre el último ejemplar de un libro.
 *
 * <p>Sin control de concurrencia, varios hilos podrían leer "1 disponible" a la vez y prestar
 * el mismo ejemplar varias veces, dejando el stock en negativo. Con {@code @Version} en
 * {@code Book}, cuando dos transacciones modifican el libro a la vez solo la primera hace commit;
 * las demás fallan con {@link OptimisticLockingFailureException} (la API responde 409), o bien,
 * si llegan después, ven el libro agotado ({@link BusinessRuleException}).
 *
 * <p>Se repite varias veces porque el orden de los hilos no es determinista: en todas las
 * repeticiones debe cumplirse lo mismo.
 */
@SpringBootTest
class LoanConcurrencyTest {

    private static final int THREADS = 10;

    @Autowired
    private LoanService loanService;
    @Autowired
    private BookRepository books;
    @Autowired
    private MemberRepository members;
    @Autowired
    private LoanRepository loans;

    @AfterEach
    void cleanUp() {
        loans.deleteAll();
        books.deleteAll();
        members.deleteAll();
    }

    @RepeatedTest(5)
    void onlyOneOfManySimultaneousLoansGetsTheLastCopy() throws Exception {
        Book book = books.save(new Book("Dune", "Frank Herbert", "Ciencia ficción", 1));
        List<Member> readers = new ArrayList<>();
        for (int i = 0; i < THREADS; i++) {
            readers.add(members.save(new Member("Lector " + i, "lector" + i + "@example.com")));
        }

        // Todos los hilos esperan en la "línea de salida" y arrancan a la vez.
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(THREADS);
        List<Future<Outcome>> futures = new ArrayList<>();
        for (Member reader : readers) {
            Callable<Outcome> attempt = () -> {
                start.await();
                try {
                    loanService.lend(new LoanRequest(book.getId(), reader.getId()));
                    return Outcome.LENT;
                } catch (OptimisticLockingFailureException e) {
                    return Outcome.CONCURRENT_CONFLICT;
                } catch (BusinessRuleException e) {
                    return Outcome.SOLD_OUT;
                }
            };
            futures.add(pool.submit(attempt));
        }
        start.countDown();

        List<Outcome> outcomes = new ArrayList<>();
        for (Future<Outcome> f : futures) {
            outcomes.add(f.get(30, TimeUnit.SECONDS)); // cualquier otra excepción hace fallar el test
        }
        pool.shutdown();

        assertThat(outcomes).as("exactamente un préstamo con éxito").containsOnlyOnce(Outcome.LENT);
        assertThat(outcomes).hasSize(THREADS);
        assertThat(loans.count()).as("solo se registró un préstamo").isEqualTo(1);
        assertThat(books.findById(book.getId()).orElseThrow().getAvailableCopies())
                .as("el stock nunca queda negativo")
                .isZero();
    }

    private enum Outcome { LENT, CONCURRENT_CONFLICT, SOLD_OUT }
}
