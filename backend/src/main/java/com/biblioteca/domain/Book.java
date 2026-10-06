package com.biblioteca.domain;

import com.biblioteca.exception.BusinessRuleException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.Objects;

/**
 * Título del catálogo junto con el control de sus ejemplares.
 *
 * <p>Invariante: {@code 0 <= availableCopies <= totalCopies}. Todas las operaciones que
 * mueven stock pasan por esta clase para que la invariante no pueda romperse desde fuera.
 *
 * <p>El campo {@link #version} activa el <em>bloqueo optimista</em>: si dos préstamos
 * simultáneos intentan llevarse el último ejemplar, el segundo commit falla en lugar de
 * dejar el stock en negativo (ver {@code GlobalExceptionHandler}).
 */
@Entity
@Table(name = "book", indexes = @Index(name = "idx_book_title", columnList = "title"))
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private long version;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 150)
    private String author;

    @Column(nullable = false, length = 80)
    private String genre;

    @Column(nullable = false)
    private int totalCopies;

    @Column(nullable = false)
    private int availableCopies;

    /** Requerido por JPA; no usar directamente. */
    protected Book() {
    }

    public Book(String title, String author, String genre, int totalCopies) {
        if (totalCopies < 1) {
            throw new BusinessRuleException("Debe haber al menos 1 ejemplar");
        }
        this.title = title;
        this.author = author;
        this.genre = genre;
        this.totalCopies = totalCopies;
        this.availableCopies = totalCopies;
    }

    public boolean isAvailable() {
        return availableCopies > 0;
    }

    /** Reserva un ejemplar para un préstamo. */
    public void borrowCopy() {
        if (!isAvailable()) {
            throw new BusinessRuleException("No hay ejemplares disponibles de «" + title + "»");
        }
        availableCopies--;
    }

    /** Devuelve un ejemplar al stock. Es idempotente respecto al tope: nunca supera el total. */
    public void returnCopy() {
        if (availableCopies < totalCopies) {
            availableCopies++;
        }
    }

    /**
     * Actualiza los datos del libro conservando los ejemplares que están prestados.
     *
     * @throws BusinessRuleException si el nuevo total es menor que los ejemplares en préstamo
     */
    public void update(String title, String author, String genre, int totalCopies) {
        int onLoan = this.totalCopies - this.availableCopies;
        if (totalCopies < onLoan) {
            throw new BusinessRuleException(
                    "El total de ejemplares no puede ser menor que los prestados (" + onLoan + ")");
        }
        this.title = title;
        this.author = author;
        this.genre = genre;
        this.totalCopies = totalCopies;
        this.availableCopies = totalCopies - onLoan;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getAuthor() { return author; }
    public String getGenre() { return genre; }
    public int getTotalCopies() { return totalCopies; }
    public int getAvailableCopies() { return availableCopies; }

    // Igualdad por identidad de BD: segura con los proxies de Hibernate y estable entre transacciones.
    @Override
    public boolean equals(Object o) {
        return this == o || (o instanceof Book other && id != null && Objects.equals(id, other.getId()));
    }

    @Override
    public int hashCode() {
        return Book.class.hashCode();
    }

    @Override
    public String toString() {
        return "Book[id=" + id + ", title=" + title + "]";
    }
}
