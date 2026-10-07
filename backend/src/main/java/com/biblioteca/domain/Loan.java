package com.biblioteca.domain;

import com.biblioteca.exception.BusinessRuleException;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Préstamo de un ejemplar a un usuario. Está <em>activo</em> mientras no tenga fecha de
 * devolución y <em>vencido</em> cuando, estando activo, la fecha límite ya pasó.
 *
 * <p>Los índices cubren las consultas de reglas y estadísticas: préstamos activos por
 * usuario, por libro y vencidos. {@link #version} evita que una misma devolución se
 * registre dos veces si llegan peticiones concurrentes.
 */
@Entity
@Table(name = "loan", indexes = {
        @Index(name = "idx_loan_member_return", columnList = "member_id, returnDate"),
        @Index(name = "idx_loan_book", columnList = "book_id"),
        @Index(name = "idx_loan_return_due", columnList = "returnDate, dueDate")
})
public class Loan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private long version;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    private Book book;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    private Member member;

    @Column(nullable = false)
    private LocalDate loanDate;

    @Column(nullable = false)
    private LocalDate dueDate;

    /** {@code null} mientras el libro no ha sido devuelto. */
    private LocalDate returnDate;

    /**
     * Veces que se ha renovado. {@code columnDefinition} con valor por defecto para que
     * {@code ddl-auto=update} pueda añadir la columna a bases que ya tienen préstamos.
     */
    @Column(nullable = false, columnDefinition = "integer default 0 not null")
    private int renewals;

    /** Fecha de la última renovación ({@code null} si nunca se renovó). */
    private LocalDate lastRenewedOn;

    /**
     * Fecha y hora de la última renovación. Puede ser {@code null} aunque haya
     * {@link #lastRenewedOn} en préstamos renovados antes de que se guardara la hora.
     */
    private LocalDateTime lastRenewedAt;

    /** Historial de renovaciones, de la más antigua a la más reciente. */
    @OneToMany(mappedBy = "loan", cascade = CascadeType.PERSIST)
    @OrderBy("renewedAt ASC")
    private List<LoanRenewal> renewalHistory = new ArrayList<>();

    /** Requerido por JPA; no usar directamente. */
    protected Loan() {
    }

    public Loan(Book book, Member member, LocalDate loanDate, LocalDate dueDate) {
        this.book = book;
        this.member = member;
        this.loanDate = loanDate;
        this.dueDate = dueDate;
    }

    public boolean isActive() {
        return returnDate == null;
    }

    public boolean isOverdue(LocalDate today) {
        return isActive() && today.isAfter(dueDate);
    }

    /**
     * Cierra el préstamo y devuelve el ejemplar al stock del libro.
     *
     * @throws BusinessRuleException si el préstamo ya había sido devuelto
     */
    public void markReturned(LocalDate date) {
        if (!isActive()) {
            throw new BusinessRuleException("El préstamo ya fue devuelto");
        }
        this.returnDate = date;
        this.book.returnCopy();
    }

    /**
     * Renueva el préstamo: la fecha límite pasa a ser {@code hoy + days}, es decir, el usuario
     * vuelve a tener el plazo completo contando desde hoy. La renovación queda en el historial
     * con su fecha y hora.
     *
     * @param now fecha y hora de la renovación
     * @return la renovación registrada
     * @throws BusinessRuleException si ya fue devuelto, si está vencido (debe devolverse), si ya
     *                               se renovó hoy o si ya tiene el plazo completo (renovar no
     *                               cambiaría nada)
     */
    public LoanRenewal renew(LocalDateTime now, int days) {
        LocalDate today = now.toLocalDate();
        if (!isActive()) {
            throw new BusinessRuleException("El préstamo ya fue devuelto");
        }
        if (isOverdue(today)) {
            throw new BusinessRuleException(
                    "No se puede renovar un préstamo vencido (venció el " + format(dueDate) + "): debe devolverse");
        }
        if (today.equals(lastRenewedOn)) {
            String at = lastRenewedAt == null ? "" : " a las " + lastRenewedAt.format(TIME);
            throw new BusinessRuleException("Este préstamo ya se renovó hoy" + at + " y vence el "
                    + format(dueDate) + ". Podrá renovarse de nuevo a partir de mañana");
        }
        LocalDate newDueDate = today.plusDays(days);
        if (!newDueDate.isAfter(dueDate)) {
            String reason = today.equals(loanDate) ? "se registró hoy y ya tiene" : "ya tiene";
            throw new BusinessRuleException("El préstamo " + reason + " el plazo completo (vence el "
                    + format(dueDate) + "). Podrá renovarse a partir de mañana");
        }
        LoanRenewal renewal = new LoanRenewal(this, now, dueDate, newDueDate);
        renewalHistory.add(renewal);
        this.dueDate = newDueDate;
        this.renewals++;
        this.lastRenewedOn = today;
        this.lastRenewedAt = now;
        return renewal;
    }

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private static String format(LocalDate date) {
        return date.format(DATE);
    }

    public Long getId() { return id; }
    public Book getBook() { return book; }
    public Member getMember() { return member; }
    public LocalDate getLoanDate() { return loanDate; }
    public LocalDate getDueDate() { return dueDate; }
    public LocalDate getReturnDate() { return returnDate; }
    public int getRenewals() { return renewals; }
    public LocalDate getLastRenewedOn() { return lastRenewedOn; }
    public LocalDateTime getLastRenewedAt() { return lastRenewedAt; }
    /** Historial de solo lectura; carga perezosa: usar dentro de una transacción. */
    public List<LoanRenewal> getRenewalHistory() { return Collections.unmodifiableList(renewalHistory); }

    @Override
    public boolean equals(Object o) {
        return this == o || (o instanceof Loan other && id != null && Objects.equals(id, other.getId()));
    }

    @Override
    public int hashCode() {
        return Loan.class.hashCode();
    }

    @Override
    public String toString() {
        return "Loan[id=" + id + ", dueDate=" + dueDate + ", returned=" + !isActive() + "]";
    }
}
