package com.biblioteca.web;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.biblioteca.domain.Book;
import com.biblioteca.domain.Loan;
import com.biblioteca.domain.Member;
import com.biblioteca.repository.BookRepository;
import com.biblioteca.repository.LoanRepository;
import com.biblioteca.repository.MemberRepository;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Préstamo repetido ({@code GET /api/loans/active}), renovación ({@code POST /api/loans/{id}/renew})
 * e historial. Los préstamos se crean con fechas pasadas directamente en la BD (la API siempre usa
 * hoy). Solo se puede renovar cuando faltan 5 días o menos para el vencimiento.
 */
@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class LoanRenewalIntegrationTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private BookRepository books;
    @Autowired
    private MemberRepository members;
    @Autowired
    private LoanRepository loans;
    @Autowired
    private JdbcTemplate jdbc;

    private final LocalDate today = LocalDate.now();
    private Book dune;
    private Book clean;
    private Member ana;
    private Loan inTime;   // prestado hace 10 días: vence en 4 → ya se puede renovar
    private Loan tooEarly; // prestado hace 5 días: vence en 9 → todavía no
    private Loan overdue;  // prestado hace 20 días: vencido

    @BeforeEach
    void seed() {
        dune = books.save(new Book("Dune", "Frank Herbert", "Ciencia ficción", 3));
        Book sapiens = books.save(new Book("Sapiens", "Harari", "Historia", 1));
        clean = books.save(new Book("Clean Code", "Robert C. Martin", "Tecnología", 1));
        ana = members.save(new Member("Ana", "ana@example.com"));
        dune.borrowCopy();
        sapiens.borrowCopy();
        clean.borrowCopy();
        inTime = loans.save(new Loan(dune, ana, today.minusDays(10), today.plusDays(4)));
        tooEarly = loans.save(new Loan(clean, ana, today.minusDays(5), today.plusDays(9)));
        overdue = loans.save(new Loan(sapiens, ana, today.minusDays(20), today.minusDays(6)));
        books.save(dune);
        books.save(sapiens);
        books.save(clean);
    }

    private static String format(LocalDate date) {
        return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    @Test
    void activeLoansOfAMemberForABookAreListed() throws Exception {
        mvc.perform(get("/api/loans/active").param("memberId", ana.getId().toString()).param("bookId", dune.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].loanDate", is(today.minusDays(10).toString())))
                .andExpect(jsonPath("$[0].status", is("ACTIVE")));

        // Otro usuario no tiene ese libro.
        Member luis = members.save(new Member("Luis", "luis@example.com"));
        mvc.perform(get("/api/loans/active").param("memberId", luis.getId().toString()).param("bookId", dune.getId().toString()))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void theResponseTellsFromWhichDayALoanCanBeRenewed() throws Exception {
        // tooEarly vence en 9 días → se puede renovar desde dentro de 4.
        mvc.perform(get("/api/loans/active").param("memberId", ana.getId().toString()).param("bookId", clean.getId().toString()))
                .andExpect(jsonPath("$[0].renewableFrom", is(today.plusDays(4).toString())));

        // Un préstamo devuelto ya no se renueva: sin fecha.
        mvc.perform(post("/api/loans/{id}/return", inTime.getId()))
                .andExpect(jsonPath("$.renewableFrom", nullValue()));
    }

    @Test
    void renewingInTheLastFiveDaysGivesFourteenDaysFromToday() throws Exception {
        mvc.perform(post("/api/loans/{id}/renew", inTime.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dueDate", is(today.plusDays(14).toString())))
                .andExpect(jsonPath("$.loanDate", is(today.minusDays(10).toString())))
                .andExpect(jsonPath("$.renewals", is(1)))
                .andExpect(jsonPath("$.lastRenewedOn", is(today.toString())))
                // Ya renovado: se podrá volver a renovar 9 días después de hoy (14 - 5).
                .andExpect(jsonPath("$.renewableFrom", is(today.plusDays(9).toString())));
    }

    @Test
    void renewingTooEarlyIsRejectedSayingFromWhen() throws Exception {
        mvc.perform(post("/api/loans/{id}/renew", tooEarly.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("No es posible renovar hasta el " + format(today.plusDays(4)))))
                .andExpect(jsonPath("$.message", containsString("5 días o menos")));

        // No se registró nada.
        mvc.perform(get("/api/loans/{id}/renewals", tooEarly.getId()))
                .andExpect(jsonPath("$.renewals", hasSize(0)))
                .andExpect(jsonPath("$.loan.dueDate", is(today.plusDays(9).toString())));
    }

    @Test
    void overdueReturnedOrUnknownLoansCannotBeRenewed() throws Exception {
        mvc.perform(post("/api/loans/{id}/renew", overdue.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("debe devolverse")));

        mvc.perform(post("/api/loans/{id}/return", inTime.getId())).andExpect(status().isOk());
        mvc.perform(post("/api/loans/{id}/renew", inTime.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("devuelto")));

        mvc.perform(post("/api/loans/{id}/renew", 999)).andExpect(status().isNotFound());
    }

    @Test
    void aLoanMadeTodayCannotBeRenewedYet() throws Exception {
        Member luis = members.save(new Member("Luis", "luis@example.com"));
        String body = "{\"bookId\":%d,\"memberId\":%d}".formatted(dune.getId(), luis.getId());
        String json = mvc.perform(post("/api/loans").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = com.jayway.jsonpath.JsonPath.<Number>read(json, "$.id").longValue();

        // Vence en 14 días → se podrá renovar desde el día 9.
        mvc.perform(post("/api/loans/{id}/renew", id))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("No es posible renovar hasta el " + format(today.plusDays(9)))));
    }

    @Test
    void renewalHistoryShowsTheInitialLoanAndEachRenewal() throws Exception {
        mvc.perform(post("/api/loans/{id}/renew", inTime.getId())).andExpect(status().isOk());

        mvc.perform(get("/api/loans/{id}/renewals", inTime.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loan.loanDate", is(today.minusDays(10).toString())))
                .andExpect(jsonPath("$.loan.renewals", is(1)))
                .andExpect(jsonPath("$.originalDueDate", is(today.plusDays(4).toString())))
                .andExpect(jsonPath("$.unrecordedRenewals", is(0)))
                .andExpect(jsonPath("$.renewals", hasSize(1)))
                .andExpect(jsonPath("$.renewals[0].number", is(1)))
                .andExpect(jsonPath("$.renewals[0].renewedAt", startsWith(today.toString())))
                .andExpect(jsonPath("$.renewals[0].previousDueDate", is(today.plusDays(4).toString())))
                .andExpect(jsonPath("$.renewals[0].newDueDate", is(today.plusDays(14).toString())))
                .andExpect(jsonPath("$.renewals[0].daysAdded", is(10)));

        mvc.perform(get("/api/loans/{id}/renewals", 999)).andExpect(status().isNotFound());
    }

    @Test
    void renewingTwiceTheSameDayIsRejectedWithTheTimeOfTheFirstRenewal() throws Exception {
        String json = mvc.perform(post("/api/loans/{id}/renew", inTime.getId()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String time = com.jayway.jsonpath.JsonPath.<String>read(json, "$.lastRenewedAt").substring(11, 16);

        mvc.perform(post("/api/loans/{id}/renew", inTime.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("ya se renovó hoy a las " + time)))
                .andExpect(jsonPath("$.message", containsString("No es posible renovar hasta el " + format(today.plusDays(9)))));
        mvc.perform(get("/api/loans/{id}/renewals", inTime.getId()))
                .andExpect(jsonPath("$.renewals", hasSize(1)));
    }

    @Test
    void renewalsMadeBeforeTheHistoryExistedAreCountedWithoutDetail() throws Exception {
        // Simula un préstamo renovado con una versión anterior (sin filas en loan_renewal).
        jdbc.update("update loan set renewals = 2, last_renewed_on = ? where id = ?",
                today.minusDays(1), inTime.getId());

        mvc.perform(get("/api/loans/{id}/renewals", inTime.getId()))
                .andExpect(jsonPath("$.unrecordedRenewals", is(2)))
                .andExpect(jsonPath("$.renewals", hasSize(0)))
                .andExpect(jsonPath("$.originalDueDate", is(today.minusDays(10).plusDays(14).toString())));
    }
}
