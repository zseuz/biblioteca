package com.biblioteca.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Una renovación de un préstamo: cuándo se hizo y cómo cambió la fecha límite. Forma el
 * historial que se consulta desde la tabla de préstamos.
 *
 * <p>Solo la crea {@link Loan#renew}, que es quien valida las reglas; por eso el constructor
 * no es público.
 */
@Entity
@Table(name = "loan_renewal", indexes = @Index(name = "idx_renewal_loan", columnList = "loan_id, renewedAt"))
public class LoanRenewal {

    /** Identificador de la renovación, generado por la base de datos. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Préstamo al que pertenece la renovación (un préstamo puede tener muchas). */
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    private Loan loan;

    /** Fecha y hora en que se renovó. */
    @Column(nullable = false)
    private LocalDateTime renewedAt;

    /** Fecha límite que tenía el préstamo antes de renovarlo. */
    @Column(nullable = false)
    private LocalDate previousDueDate;

    /** Fecha límite tras la renovación ({@code día de la renovación + plazo}). */
    @Column(nullable = false)
    private LocalDate newDueDate;

    /** Requerido por JPA; no usar directamente. */
    protected LoanRenewal() {
    }

    LoanRenewal(Loan loan, LocalDateTime renewedAt, LocalDate previousDueDate, LocalDate newDueDate) {
        this.loan = loan;
        this.renewedAt = renewedAt;
        this.previousDueDate = previousDueDate;
        this.newDueDate = newDueDate;
    }

    /** Getters de solo lectura: una renovación no se modifica después de registrarse. */
    public Long getId() { return id; }
    public Loan getLoan() { return loan; }
    public LocalDateTime getRenewedAt() { return renewedAt; }
    public LocalDate getPreviousDueDate() { return previousDueDate; }
    public LocalDate getNewDueDate() { return newDueDate; }

    /** Igualdad por id de base de datos. */
    @Override
    public boolean equals(Object o) {
        return this == o || (o instanceof LoanRenewal other && id != null && Objects.equals(id, other.getId()));
    }

    /** Constante por clase, coherente con {@link #equals}. */
    @Override
    public int hashCode() {
        return LoanRenewal.class.hashCode();
    }
}
