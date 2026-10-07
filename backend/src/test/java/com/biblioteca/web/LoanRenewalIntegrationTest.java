package com.biblioteca.web;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Préstamo repetido ({@code GET /api/loans/active}) y renovación ({@code POST /api/loans/{id}/renew}).
 * Los préstamos se crean con fechas pasadas directamente en la BD (la API siempre usa hoy).
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

    private final LocalDate today = LocalDate.now();
    private Book dune;
    private Member ana;
    private Loan inTime;   // prestado hace 5 días: en plazo
    private Loan overdue;  // prestado hace 20 días: vencido

    @BeforeEach
    void seed() {
        dune = books.save(new Book("Dune", "Frank Herbert", "Ciencia ficción", 3));
        Book sapiens = books.save(new Book("Sapiens", "Harari", "Historia", 1));
        ana = members.save(new Member("Ana", "ana@example.com"));
        dune.borrowCopy();
        sapiens.borrowCopy();
        inTime = loans.save(new Loan(dune, ana, today.minusDays(5), today.plusDays(9)));
        overdue = loans.save(new Loan(sapiens, ana, today.minusDays(20), today.minusDays(6)));
        books.save(dune);
        books.save(sapiens);
    }

    @Test
    void activeLoansOfAMemberForABookAreListed() throws Exception {
        mvc.perform(get("/api/loans/active").param("memberId", ana.getId().toString()).param("bookId", dune.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].loanDate", is(today.minusDays(5).toString())))
                .andExpect(jsonPath("$[0].status", is("ACTIVE")));

        // Otro usuario no tiene ese libro.
        Member luis = members.save(new Member("Luis", "luis@example.com"));
        mvc.perform(get("/api/loans/active").param("memberId", luis.getId().toString()).param("bookId", dune.getId().toString()))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void renewingALoanInTimeGivesFourteenDaysFromToday() throws Exception {
        mvc.perform(post("/api/loans/{id}/renew", inTime.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dueDate", is(today.plusDays(14).toString())))
                .andExpect(jsonPath("$.loanDate", is(today.minusDays(5).toString())))
                .andExpect(jsonPath("$.renewals", is(1)))
                .andExpect(jsonPath("$.lastRenewedOn", is(today.toString())));
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
    void aLoanMadeTodayAlreadyHasTheFullPeriod() throws Exception {
        Member luis = members.save(new Member("Luis", "luis@example.com"));
        String body = "{\"bookId\":%d,\"memberId\":%d}".formatted(dune.getId(), luis.getId());
        String json = mvc.perform(post("/api/loans").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = com.jayway.jsonpath.JsonPath.<Number>read(json, "$.id").longValue();

        mvc.perform(post("/api/loans/{id}/renew", id))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("plazo completo")));
    }
}
