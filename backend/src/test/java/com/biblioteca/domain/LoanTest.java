package com.biblioteca.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.biblioteca.exception.BusinessRuleException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Reglas de la renovación de préstamos (sin base de datos). */
class LoanTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 7);
    private static final LocalDateTime NOW = TODAY.atTime(10, 42, 5);
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

        loan.renew(NOW, 14);

        assertThat(loan.getDueDate()).isEqualTo(TODAY.plusDays(14));
        assertThat(loan.getRenewals()).isEqualTo(1);
        assertThat(loan.getLastRenewedOn()).isEqualTo(TODAY);
        assertThat(loan.getLoanDate()).as("la fecha del préstamo no cambia").isEqualTo(TODAY.minusDays(10));
    }

    @Test
    void renewalsAreCountedWithoutLimit() {
        Loan loan = loanStartedDaysAgo(10);
        loan.renew(TODAY.minusDays(5).atTime(9, 0), 14);
        loan.renew(NOW, 14);

        assertThat(loan.getRenewals()).isEqualTo(2);
        assertThat(loan.getDueDate()).isEqualTo(TODAY.plusDays(14));
    }

    @Test
    void overdueLoanCannotBeRenewed() {
        Loan loan = loanStartedDaysAgo(20); // venció hace 6 días

        assertThatThrownBy(() -> loan.renew(NOW, 14))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("vencido");
        assertThat(loan.getRenewals()).isZero();
    }

    @Test
    void dueTodayIsStillInTimeAndCanBeRenewed() {
        Loan loan = loanStartedDaysAgo(14); // vence hoy: aún no está vencido

        loan.renew(NOW, 14);

        assertThat(loan.getDueDate()).isEqualTo(TODAY.plusDays(14));
    }

    @Test
    void returnedLoanCannotBeRenewed() {
        Loan loan = loanStartedDaysAgo(3);
        loan.markReturned(TODAY);

        assertThatThrownBy(() -> loan.renew(NOW, 14)).hasMessageContaining("devuelto");
    }

    @Test
    void eachRenewalIsRecordedWithItsDateTimeAndDueDates() {
        Loan loan = loanStartedDaysAgo(10); // vence el 11/10

        LoanRenewal renewal = loan.renew(NOW, 14);

        assertThat(renewal.getRenewedAt()).isEqualTo(NOW);
        assertThat(renewal.getPreviousDueDate()).isEqualTo(TODAY.plusDays(4));
        assertThat(renewal.getNewDueDate()).isEqualTo(TODAY.plusDays(14));
        assertThat(loan.getRenewalHistory()).containsExactly(renewal);
        assertThat(loan.getLastRenewedAt()).isEqualTo(NOW);
    }

    @Test
    void aLoanCanOnlyBeRenewedOncePerDayAndTheMessageSaysWhen() {
        Loan loan = loanStartedDaysAgo(10);
        loan.renew(NOW, 14);

        assertThatThrownBy(() -> loan.renew(NOW.plusHours(2), 14))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("ya se renovó hoy a las 10:42")
                .hasMessageContaining("21/10/2026")
                .hasMessageContaining("a partir de mañana");
        assertThat(loan.getRenewals()).isEqualTo(1);
        assertThat(loan.getRenewalHistory()).hasSize(1);

        loan.renew(NOW.plusDays(1), 14); // al día siguiente sí
        assertThat(loan.getRenewals()).isEqualTo(2);
    }

    @Test
    void renewingALoanThatAlreadyHasTheFullPeriodIsRejected() {
        Loan loan = loanStartedDaysAgo(0); // prestado hoy: ya vence en 14 días

        assertThatThrownBy(() -> loan.renew(NOW, 14)).hasMessageContaining("se registró hoy y ya tiene el plazo completo");
        assertThat(loan.getRenewals()).isZero();
    }
}
