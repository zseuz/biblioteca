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

    /** Identificador del préstamo, generado por la base de datos. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Bloqueo optimista: impide registrar dos veces la misma devolución o renovación simultánea. */
    @Version
    private long version;

    /**
     * Libro prestado. {@code LAZY}: no se carga hasta que se usa; las consultas que lo necesitan
     * lo traen con {@code join fetch} para evitar consultas extra.
     */
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    private Book book;

    /** Usuario que tiene el libro (carga perezosa, como el libro). */
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    private Member member;

    /** Día en que se prestó. No cambia al renovar. */
    @Column(nullable = false)
    private LocalDate loanDate;

    /** Fecha límite de devolución. Al renovar pasa a ser «día de la renovación + 14». */
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

    /**
     * Crea un préstamo activo. El descuento del ejemplar lo hace quien lo crea
     * ({@code Book.borrowCopy()}), para que la regla de stock esté en un solo sitio.
     */
    public Loan(Book book, Member member, LocalDate loanDate, LocalDate dueDate) {
        this.book = book;
        this.member = member;
        this.loanDate = loanDate;
        this.dueDate = dueDate;
    }

    /** ¿Sigue sin devolverse? (incluye los vencidos) */
    public boolean isActive() {
        return returnDate == null;
    }

    /**
     * ¿Está vencido a la fecha {@code today}? Solo si sigue activo y ya pasó la fecha límite;
     * el propio día del vencimiento todavía está en plazo.
     */
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
     * Primer día en que se puede renovar: cuando faltan {@code windowDays} días o menos para el
     * vencimiento. Antes de esa fecha la renovación no está permitida.
     */
    public LocalDate renewableFrom(int windowDays) {
        return dueDate.minusDays(windowDays);
    }

    /**
     * Renueva el préstamo: la fecha límite pasa a ser {@code hoy + days}, es decir, el usuario
     * vuelve a tener el plazo completo contando desde hoy. La renovación queda en el historial
     * con su fecha y hora.
     *
     * <p>Solo se puede renovar en los últimos {@code windowDays} días antes del vencimiento
     * (incluido el propio día de vencimiento); antes, se informa desde qué fecha se podrá.
     *
     * @param now        fecha y hora de la renovación
     * @param days       plazo que se vuelve a conceder
     * @param windowDays días antes del vencimiento a partir de los cuales se permite renovar
     * @return la renovación registrada
     * @throws BusinessRuleException si ya fue devuelto, si está vencido (debe devolverse) o si
     *                               todavía no es el momento de renovar
     */
    public LoanRenewal renew(LocalDateTime now, int days, int windowDays) {
        LocalDate today = now.toLocalDate();
        if (!isActive()) {
            throw new BusinessRuleException("El préstamo ya fue devuelto");
        }
        if (isOverdue(today)) {
            throw new BusinessRuleException(
                    "No se puede renovar un préstamo vencido (venció el " + format(dueDate) + "): debe devolverse");
        }
        LocalDate from = renewableFrom(windowDays);
        if (today.isBefore(from)) {
            String renewedToday = today.equals(lastRenewedOn)
                    ? "Este préstamo ya se renovó hoy" + (lastRenewedAt == null ? "" : " a las " + lastRenewedAt.format(TIME)) + ". "
                    : "";
            throw new BusinessRuleException(renewedToday + "No es posible renovar hasta el " + format(from)
                    + ": solo se puede renovar cuando faltan " + windowDays + " días o menos para el vencimiento"
                    + " (vence el " + format(dueDate) + ")");
        }
        LocalDate newDueDate = today.plusDays(days);
        if (!newDueDate.isAfter(dueDate)) {
            // Solo ocurre si la ventana es mayor que el plazo: renovar no ampliaría nada.
            throw new BusinessRuleException("El préstamo ya tiene el plazo completo: vence el " + format(dueDate));
        }
        LoanRenewal renewal = new LoanRenewal(this, now, dueDate, newDueDate);
        renewalHistory.add(renewal);
        this.dueDate = newDueDate;
        this.renewals++;
        this.lastRenewedOn = today;
        this.lastRenewedAt = now;
        return renewal;
    }

    /** Formatos de fecha y hora de los mensajes para el usuario (07/10/2026, 10:42). */
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    /** Fecha en formato dd/MM/yyyy para los mensajes de error. */
    private static String format(LocalDate date) {
        return date.format(DATE);
    }

    /** Getters de solo lectura: el estado cambia solo con {@link #renew}, {@link #markReturned} y el constructor. */
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

    /** Igualdad por id de base de datos (segura con los proxies de Hibernate). */
    @Override
    public boolean equals(Object o) {
        return this == o || (o instanceof Loan other && id != null && Objects.equals(id, other.getId()));
    }

    /** Constante por clase, coherente con {@link #equals}. */
    @Override
    public int hashCode() {
        return Loan.class.hashCode();
    }

    /** Texto corto para los logs. */
    @Override
    public String toString() {
        return "Loan[id=" + id + ", dueDate=" + dueDate + ", returned=" + !isActive() + "]";
    }
}
