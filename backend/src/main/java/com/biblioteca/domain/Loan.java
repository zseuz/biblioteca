package com.biblioteca.domain;

import com.biblioteca.exception.BusinessRuleException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDate;
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

    public Long getId() { return id; }
    public Book getBook() { return book; }
    public Member getMember() { return member; }
    public LocalDate getLoanDate() { return loanDate; }
    public LocalDate getDueDate() { return dueDate; }
    public LocalDate getReturnDate() { return returnDate; }

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
