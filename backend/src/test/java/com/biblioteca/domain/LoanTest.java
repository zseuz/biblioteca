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

    private static final int DAYS = 14;
    /** Solo se puede renovar cuando faltan 5 días o menos para el vencimiento. */
    private static final int WINDOW = 5;
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 7);
    private static final LocalDateTime NOW = TODAY.atTime(10, 42, 5);
    private Book book;
    private Member member;

    @BeforeEach
    void setUp() {
        book = new Book("Dune", "Frank Herbert", "Ciencia ficción", 2);
        member = new Member("Ana", "ana@example.com");
    }

    /** Préstamo hecho hace {@code days} días con plazo de 14: vence en {@code 14 - days} días. */
    private Loan loanStartedDaysAgo(int days) {
        book.borrowCopy();
        LocalDate start = TODAY.minusDays(days);
        return new Loan(book, member, start, start.plusDays(DAYS));
    }

    private LoanRenewal renew(Loan loan, LocalDateTime when) {
        return loan.renew(when, DAYS, WINDOW);
    }

    @Test
    void renewGivesTheFullPeriodAgainFromToday() {
        Loan loan = loanStartedDaysAgo(10); // vence en 4 días: dentro de la ventana

        renew(loan, NOW);

        assertThat(loan.getDueDate()).isEqualTo(TODAY.plusDays(14));
        assertThat(loan.getRenewals()).isEqualTo(1);
        assertThat(loan.getLastRenewedOn()).isEqualTo(TODAY);
        assertThat(loan.getLoanDate()).as("la fecha del préstamo no cambia").isEqualTo(TODAY.minusDays(10));
    }

    @Test
    void canBeRenewedExactlyWhenFiveDaysRemain() {
        Loan loan = loanStartedDaysAgo(9); // vence en 5 días: primer día permitido

        assertThat(loan.renewableFrom(WINDOW)).isEqualTo(TODAY);
        renew(loan, NOW);

        assertThat(loan.getRenewals()).isEqualTo(1);
    }

    @Test
    void cannotBeRenewedBeforeTheLastFiveDaysAndTheMessageSaysFromWhen() {
        Loan loan = loanStartedDaysAgo(8); // vence en 6 días: un día antes de poder renovar

        assertThatThrownBy(() -> renew(loan, NOW))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("No es posible renovar hasta el 08/10/2026")
                .hasMessageContaining("5 días o menos")
                .hasMessageContaining("vence el 13/10/2026");
        assertThat(loan.getRenewals()).isZero();
        assertThat(loan.getRenewalHistory()).isEmpty();
        assertThat(loan.getDueDate()).isEqualTo(TODAY.plusDays(6));
    }

    @Test
    void aLoanMadeTodayCannotBeRenewedUntilItsLastDays() {
        Loan loan = loanStartedDaysAgo(0); // vence el 21/10 → se podrá renovar desde el 16/10

        assertThatThrownBy(() -> renew(loan, NOW)).hasMessageContaining("No es posible renovar hasta el 16/10/2026");
        assertThat(loan.getRenewals()).isZero();
    }

    @Test
    void renewalsAreCountedWithoutLimitWhenEachOneIsInTheWindow() {
        Loan loan = loanStartedDaysAgo(10); // vence el 11/10
        renew(loan, TODAY.minusDays(1).atTime(9, 0)); // faltaban 5 días → vence el 20/10
        renew(loan, TODAY.plusDays(9).atTime(9, 0));  // el 16/10 faltan 4 días → vence el 30/10

        assertThat(loan.getRenewals()).isEqualTo(2);
        assertThat(loan.getDueDate()).isEqualTo(TODAY.plusDays(23));
    }

    @Test
    void overdueLoanCannotBeRenewed() {
        Loan loan = loanStartedDaysAgo(20); // venció hace 6 días

        assertThatThrownBy(() -> renew(loan, NOW))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("vencido");
        assertThat(loan.getRenewals()).isZero();
    }

    @Test
    void dueTodayIsStillInTimeAndCanBeRenewed() {
        Loan loan = loanStartedDaysAgo(14); // vence hoy: aún no está vencido

        renew(loan, NOW);

        assertThat(loan.getDueDate()).isEqualTo(TODAY.plusDays(14));
    }

    @Test
    void returnedLoanCannotBeRenewed() {
        Loan loan = loanStartedDaysAgo(3);
        loan.markReturned(TODAY);

        assertThatThrownBy(() -> renew(loan, NOW)).hasMessageContaining("devuelto");
    }

    @Test
    void eachRenewalIsRecordedWithItsDateTimeAndDueDates() {
        Loan loan = loanStartedDaysAgo(10); // vence el 11/10

        LoanRenewal renewal = renew(loan, NOW);

        assertThat(renewal.getRenewedAt()).isEqualTo(NOW);
        assertThat(renewal.getPreviousDueDate()).isEqualTo(TODAY.plusDays(4));
        assertThat(renewal.getNewDueDate()).isEqualTo(TODAY.plusDays(14));
        assertThat(loan.getRenewalHistory()).containsExactly(renewal);
        assertThat(loan.getLastRenewedAt()).isEqualTo(NOW);
    }

    @Test
    void renewingAgainTheSameDayIsRejectedMentioningTheTimeAndTheNextDate() {
        Loan loan = loanStartedDaysAgo(10);
        renew(loan, NOW); // ahora vence el 21/10 → se podrá renovar desde el 16/10

        assertThatThrownBy(() -> renew(loan, NOW.plusHours(2)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("ya se renovó hoy a las 10:42")
                .hasMessageContaining("No es posible renovar hasta el 16/10/2026");
        assertThat(loan.getRenewals()).isEqualTo(1);
        assertThat(loan.getRenewalHistory()).hasSize(1);
    }

    @Test
    void windowOfZeroAllowsRenewingOnlyOnTheDueDate() {
        Loan loan = loanStartedDaysAgo(13); // vence mañana

        assertThatThrownBy(() -> loan.renew(NOW, DAYS, 0)).hasMessageContaining("No es posible renovar hasta el 08/10/2026");
        loan.renew(NOW.plusDays(1), DAYS, 0); // el día del vencimiento sí
        assertThat(loan.getRenewals()).isEqualTo(1);
    }
}
