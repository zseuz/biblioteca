package com.biblioteca.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.biblioteca.exception.BusinessRuleException;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Reglas de la renovación de préstamos (sin base de datos). */
class LoanTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 7);
    private Book book;
    private Member member;

    @BeforeEach
    void setUp() {
        book = new Book("Dune", "Frank Herbert", "Ciencia ficción", 2);
        member = new Member("Ana", "ana@example.com");
    }

    private Loan loanStartedDaysAgo(int days) {
        book.borrowCopy();
        LocalDate start = TODAY.minusDays(days);
        return new Loan(book, member, start, start.plusDays(14));
    }

    @Test
    void renewGivesTheFullPeriodAgainFromToday() {
        Loan loan = loanStartedDaysAgo(10); // vence en 4 días

        loan.renew(TODAY, 14);

        assertThat(loan.getDueDate()).isEqualTo(TODAY.plusDays(14));
        assertThat(loan.getRenewals()).isEqualTo(1);
        assertThat(loan.getLastRenewedOn()).isEqualTo(TODAY);
        assertThat(loan.getLoanDate()).as("la fecha del préstamo no cambia").isEqualTo(TODAY.minusDays(10));
    }

    @Test
    void renewalsAreCountedWithoutLimit() {
        Loan loan = loanStartedDaysAgo(10);
        loan.renew(TODAY.minusDays(5), 14);
        loan.renew(TODAY, 14);

        assertThat(loan.getRenewals()).isEqualTo(2);
        assertThat(loan.getDueDate()).isEqualTo(TODAY.plusDays(14));
    }

    @Test
    void overdueLoanCannotBeRenewed() {
        Loan loan = loanStartedDaysAgo(20); // venció hace 6 días

        assertThatThrownBy(() -> loan.renew(TODAY, 14))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("vencido");
        assertThat(loan.getRenewals()).isZero();
    }

    @Test
    void dueTodayIsStillInTimeAndCanBeRenewed() {
        Loan loan = loanStartedDaysAgo(14); // vence hoy: aún no está vencido

        loan.renew(TODAY, 14);

        assertThat(loan.getDueDate()).isEqualTo(TODAY.plusDays(14));
    }

    @Test
    void returnedLoanCannotBeRenewed() {
        Loan loan = loanStartedDaysAgo(3);
        loan.markReturned(TODAY);

        assertThatThrownBy(() -> loan.renew(TODAY, 14)).hasMessageContaining("devuelto");
    }

    @Test
    void renewingALoanThatAlreadyHasTheFullPeriodIsRejected() {
        Loan loan = loanStartedDaysAgo(0); // prestado hoy: ya vence en 14 días

        assertThatThrownBy(() -> loan.renew(TODAY, 14)).hasMessageContaining("plazo completo");
        assertThat(loan.getRenewals()).isZero();
    }
}
