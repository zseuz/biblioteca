package com.biblioteca.web;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.biblioteca.domain.Book;
import com.biblioteca.domain.Loan;
import com.biblioteca.domain.Member;
import com.biblioteca.repository.BookRepository;
import com.biblioteca.repository.LoanRepository;
import com.biblioteca.repository.MemberRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import com.biblioteca.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Búsqueda paginada del historial ({@code GET /api/loans}) y contadores ({@code /summary}).
 *
 * <p>Los préstamos se crean directamente con fechas pasadas (la API siempre usa la fecha de hoy),
 * para tener a la vez préstamos activos, vencidos y devueltos con fechas distintas y predecibles.
 */
class LoanSearchIntegrationTest extends IntegrationTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private BookRepository books;
    @Autowired
    private MemberRepository members;
    @Autowired
    private LoanRepository loans;

    private final LocalDate today = LocalDate.now();

    /**
     * 12 préstamos: 5 activos, 3 vencidos y 4 devueltos. Títulos "Libro 01".."Libro 12" y dos
     * usuarios (Ana, Bruno) para poder comprobar búsqueda y orden.
     */
    @BeforeEach
    void seed() {
        Member ana = members.save(new Member("Ana Torres", "ana@example.com"));
        Member bruno = members.save(new Member("Bruno Díaz", "bruno@example.com"));
        List<Loan> all = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            Book book = books.save(new Book("Libro %02d".formatted(i), "Autor", i % 2 == 0 ? "Novela" : "Historia", 1));
            Member member = i <= 6 ? ana : bruno;
            book.borrowCopy();
            LocalDate start;
            if (i <= 5) {
                start = today.minusDays(i);              // activos: vencen en el futuro
            } else if (i <= 8) {
                start = today.minusDays(20 + i);         // vencidos
            } else {
                start = today.minusDays(40 + i);         // devueltos
            }
            Loan loan = new Loan(book, member, start, start.plusDays(14));
            if (i > 8) {
                loan.markReturned(start.plusDays(7));
            }
            all.add(loan);
        }
        loans.saveAll(all);
    }

    /** Sin parámetros: primera página de 10, con los préstamos más recientes primero. */
    @Test
    void firstPageWithDefaultsShowsTheMostRecentLoansFirst() throws Exception {
        mvc.perform(get("/api/loans").param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(5)))
                .andExpect(jsonPath("$.page", is(0)))
                .andExpect(jsonPath("$.size", is(5)))
                .andExpect(jsonPath("$.totalElements", is(12)))
                .andExpect(jsonPath("$.totalPages", is(3)))
                // Por fecha de préstamo descendente: Libro 01 (hace 1 día), Libro 02 (hace 2)...
                .andExpect(jsonPath("$.content[0].bookTitle", is("Libro 01")))
                .andExpect(jsonPath("$.content[1].bookTitle", is("Libro 02")))
                .andExpect(jsonPath("$.content[4].bookTitle", is("Libro 05")));
    }

    /** La última página trae solo los elementos que sobran. */
    @Test
    void lastPageContainsTheRemainder() throws Exception {
        mvc.perform(get("/api/loans").param("size", "5").param("page", "2"))
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.page", is(2)));
    }

    /** Filtros Activos, Vencidos y Devueltos (sin distinguir mayúsculas en el parámetro). */
    @Test
    void filtersByStatus() throws Exception {
        mvc.perform(get("/api/loans").param("status", "OVERDUE"))
                .andExpect(jsonPath("$.totalElements", is(3)))
                .andExpect(jsonPath("$.content[*].status", contains("OVERDUE", "OVERDUE", "OVERDUE")));
        mvc.perform(get("/api/loans").param("status", "active")) // sin distinguir mayúsculas
                .andExpect(jsonPath("$.totalElements", is(5)));
        mvc.perform(get("/api/loans").param("status", "RETURNED"))
                .andExpect(jsonPath("$.totalElements", is(4)));
    }

    /**
     * Búsqueda por título del libro o nombre del usuario: sin distinguir mayúsculas ni tildes,
     * combinable con el estado, y con «%» y «_» tratados como texto.
     */
    @Test
    void searchesByBookTitleOrMemberName() throws Exception {
        mvc.perform(get("/api/loans").param("q", "libro 03"))
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].bookTitle", is("Libro 03")));
        mvc.perform(get("/api/loans").param("q", "BRUNO"))
                .andExpect(jsonPath("$.totalElements", is(6)));
        // Combinado con el estado: Bruno tiene 2 vencidos (7, 8) y 4 devueltos.
        mvc.perform(get("/api/loans").param("q", "bruno").param("status", "OVERDUE"))
                .andExpect(jsonPath("$.totalElements", is(2)));

        // Tildes: Bruno Díaz se encuentra con o sin tilde y en mayúsculas.
        // Bruno Díaz tiene 6 préstamos: se encuentra con o sin tilde y en mayúsculas.
        mvc.perform(get("/api/loans").param("q", "diaz")).andExpect(jsonPath("$.totalElements", is(6)));
        mvc.perform(get("/api/loans").param("q", "DÍAZ")).andExpect(jsonPath("$.totalElements", is(6)));
        mvc.perform(get("/api/loans").param("q", "díaz")).andExpect(jsonPath("$.totalElements", is(6)));
        mvc.perform(get("/api/loans").param("q", "dias")).andExpect(jsonPath("$.totalElements", is(0)));

        // «%» y «_» se buscan como texto, no como comodines de SQL.
        mvc.perform(get("/api/loans").param("q", "%")).andExpect(jsonPath("$.totalElements", is(0)));
        mvc.perform(get("/api/loans").param("q", "_")).andExpect(jsonPath("$.totalElements", is(0)));
    }


    /** Las estadísticas cuentan como activos solo los préstamos en plazo, igual que el resumen. */
    @Test
    void statsCountOnlyInTimeLoansAsActiveLikeTheLoanSummary() throws Exception {
        // Mismos números que /api/loans/summary: 5 en plazo, 3 vencidos y 4 devueltos.
        mvc.perform(get("/api/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeLoans", is(5)))
                .andExpect(jsonPath("$.overdueLoans", is(3)))
                .andExpect(jsonPath("$.returnedLoans", is(4)));
    }


    /** Ordena por las columnas permitidas en ambos sentidos. */
    @Test
    void sortsByWhitelistedFieldsInBothDirections() throws Exception {
        mvc.perform(get("/api/loans").param("sort", "bookTitle").param("direction", "desc").param("size", "2"))
                .andExpect(jsonPath("$.content[*].bookTitle", contains("Libro 12", "Libro 11")));
        mvc.perform(get("/api/loans").param("sort", "memberName").param("size", "1"))
                .andExpect(jsonPath("$.content[0].memberName", is("Ana Torres")));
        // Por estado: ACTIVE < OVERDUE < RETURNED.
        mvc.perform(get("/api/loans").param("sort", "status").param("size", "12"))
                .andExpect(jsonPath("$.content[0].status", is("ACTIVE")))
                .andExpect(jsonPath("$.content[11].status", is("RETURNED")));
    }

    /** El tamaño de página se acota entre 1 y 100, y una página negativa pasa a 0. */
    @Test
    void pageSizeIsClampedToTheAllowedRange() throws Exception {
        mvc.perform(get("/api/loans").param("size", "1000")).andExpect(jsonPath("$.size", is(100)));
        mvc.perform(get("/api/loans").param("size", "0")).andExpect(jsonPath("$.size", is(1)));
        mvc.perform(get("/api/loans").param("page", "-3")).andExpect(jsonPath("$.page", is(0)));
    }

    /** Orden, estado o sentido no válidos responden 400 con un mensaje claro. */
    @Test
    void invalidParametersReturn400WithAClearMessage() throws Exception {
        mvc.perform(get("/api/loans").param("sort", "password"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", is("sort debe ser uno de bookTitle, memberName, loanDate, dueDate, status")));
        mvc.perform(get("/api/loans").param("status", "PERDIDO")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/loans").param("direction", "up")).andExpect(status().isBadRequest());
    }

    /** El resumen devuelve total, en plazo, vencidos y devueltos en una sola llamada. */
    @Test
    void summaryCountsEveryStatusInOneCall() throws Exception {
        mvc.perform(get("/api/loans/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total", is(12)))
                .andExpect(jsonPath("$.active", is(5)))
                .andExpect(jsonPath("$.overdue", is(3)))
                .andExpect(jsonPath("$.returned", is(4)));
    }
}
