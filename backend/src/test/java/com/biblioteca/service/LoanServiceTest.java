package com.biblioteca.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.biblioteca.config.LibraryProperties;
import com.biblioteca.domain.Book;
import com.biblioteca.domain.Loan;
import com.biblioteca.domain.Member;
import com.biblioteca.dto.LoanRequest;
import com.biblioteca.dto.LoanResponse;
import com.biblioteca.exception.BusinessRuleException;
import com.biblioteca.exception.NotFoundException;
import com.biblioteca.repository.BookRepository;
import com.biblioteca.repository.LoanRepository;
import com.biblioteca.repository.MemberRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Pruebas unitarias de las reglas de préstamo. Sin Spring ni BD: repositorios simulados y
 * reloj fijo, para que cada regla se verifique de forma aislada, rápida y determinista.
 */
class LoanServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 3, 10);
    private static final int DAYS = 14;
    private static final int MAX_ACTIVE = 3;

    private LoanRepository loans;
    private LoanService service;
    private Book book;
    private Member member;

    @BeforeEach
    void setUp() {
        loans = mock(LoanRepository.class);
        BookRepository books = mock(BookRepository.class);
        MemberRepository members = mock(MemberRepository.class);
        Clock clock = Clock.fixed(Instant.parse("2026-03-10T10:00:00Z"), ZoneOffset.UTC);
        LibraryProperties props = new LibraryProperties(new LibraryProperties.Loans(DAYS, MAX_ACTIVE, 5));
        service = new LoanService(loans, books, members, props, clock);

        book = new Book("Dune", "Frank Herbert", "Ciencia ficción", 1);
        member = new Member("Ana", "ana@example.com");
        ReflectionTestUtils.setField(book, "id", 1L);
        ReflectionTestUtils.setField(member, "id", 2L);
        when(books.findById(1L)).thenReturn(Optional.of(book));
        when(members.findById(2L)).thenReturn(Optional.of(member));
        when(loans.save(any(Loan.class))).thenAnswer(i -> i.getArgument(0));
    }

    /** Prestar crea un préstamo activo que vence en 14 días y descuenta un ejemplar. */
    @Test
    void lendsForConfiguredDaysAndTakesOneCopy() {
        LoanResponse loan = service.lend(new LoanRequest(1L, 2L));

        assertThat(loan.loanDate()).isEqualTo(TODAY);
        assertThat(loan.dueDate()).isEqualTo(TODAY.plusDays(DAYS));
        assertThat(loan.status()).isEqualTo("ACTIVE");
        assertThat(book.getAvailableCopies()).isZero();
    }

    /** Libro agotado: se rechaza y no se guarda ningún préstamo (verify ... never()). */
    @Test
    void rejectsWhenNoCopiesAvailable() {
        book.borrowCopy();

        assertThatThrownBy(() -> service.lend(new LoanRequest(1L, 2L)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("ejemplares");
        verify(loans, never()).save(any());
    }

    /** Usuario con 3 préstamos activos: se rechaza el cuarto sin gastar stock. */
    @Test
    void rejectsWhenMemberReachedMaxActiveLoans() {
        when(loans.countByMemberIdAndReturnDateIsNull(2L)).thenReturn((long) MAX_ACTIVE);

        assertThatThrownBy(() -> service.lend(new LoanRequest(1L, 2L)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("máximo");
        assertThat(book.getAvailableCopies()).as("no debe consumir stock al rechazar").isEqualTo(1);
    }

    /** Usuario con préstamos vencidos: no puede pedir más. */
    @Test
    void rejectsWhenMemberHasOverdueLoans() {
        when(loans.existsByMemberIdAndReturnDateIsNullAndDueDateBefore(2L, TODAY)).thenReturn(true);

        assertThatThrownBy(() -> service.lend(new LoanRequest(1L, 2L)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("vencidos");
    }

    /** Libro o usuario inexistente: NotFoundException (la API responde 404). */
    @Test
    void rejectsUnknownBookOrMember() {
        assertThatThrownBy(() -> service.lend(new LoanRequest(99L, 2L))).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.lend(new LoanRequest(1L, 99L))).isInstanceOf(NotFoundException.class);
    }

    /** Devolver repone el ejemplar; una segunda devolución se rechaza y no vuelve a reponer. */
    @Test
    void returnRestoresStockAndCannotBeRepeated() {
        book.borrowCopy();
        Loan loan = new Loan(book, member, TODAY.minusDays(3), TODAY.plusDays(11));
        when(loans.findByIdWithDetails(5L)).thenReturn(Optional.of(loan));

        LoanResponse returned = service.giveBack(5L);

        assertThat(returned.returnDate()).isEqualTo(TODAY);
        assertThat(returned.status()).isEqualTo("RETURNED");
        assertThat(book.getAvailableCopies()).isEqualTo(1);
        assertThatThrownBy(() -> service.giveBack(5L)).isInstanceOf(BusinessRuleException.class);
        assertThat(book.getAvailableCopies()).as("una doble devolución no repone stock").isEqualTo(1);
    }

    /** Un préstamo está vencido solo si sigue activo y ya pasó la fecha límite. */
    @Test
    void loanIsOverdueOnlyAfterDueDateWhileActive() {
        book.borrowCopy();
        Loan loan = new Loan(book, member, TODAY.minusDays(20), TODAY.minusDays(6));

        assertThat(loan.isOverdue(TODAY)).isTrue();
        assertThat(loan.isOverdue(TODAY.minusDays(6))).as("el día del vencimiento aún es válido").isFalse();
        loan.markReturned(TODAY);
        assertThat(loan.isOverdue(TODAY)).isFalse();
    }
}
