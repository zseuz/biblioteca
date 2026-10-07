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

    /** Identificador del libro; lo genera la base de datos al guardar (1, 2, 3…). */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Número de versión para el bloqueo optimista: Hibernate lo incrementa en cada cambio y
     * rechaza el guardado si otra transacción lo modificó antes (evita prestar dos veces el último ejemplar).
     */
    @Version
    private long version;

    /** Título del libro (máximo 200 caracteres, igual que valida la API). */
    @Column(nullable = false, length = 200)
    private String title;

    /** Autor (máximo 150 caracteres). */
    @Column(nullable = false, length = 150)
    private String author;

    /** Género literario (máximo 80 caracteres). Puede ser uno sugerido o uno nuevo. */
    @Column(nullable = false, length = 80)
    private String genre;

    /** Ejemplares que tiene la biblioteca en total (prestados y disponibles). */
    @Column(nullable = false)
    private int totalCopies;

    /**
     * Ejemplares que se pueden prestar ahora mismo. Solo cambia con {@link #borrowCopy()},
     * {@link #returnCopy()}, {@link #addCopies(int)} y {@link #update}; nunca baja de 0 ni supera el total.
     */
    @Column(nullable = false)
    private int availableCopies;

    /** Requerido por JPA; no usar directamente. */
    protected Book() {
    }

    /**
     * Crea un libro nuevo con todos sus ejemplares disponibles.
     *
     * @throws BusinessRuleException si no tiene al menos 1 ejemplar
     */
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

    /** ¿Queda al menos un ejemplar para prestar? (falso = libro agotado) */
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
     * Incorpora nuevos ejemplares del mismo libro (p. ej. al intentar registrarlo de nuevo).
     * Llegan disponibles, así que aumentan tanto el total como los disponibles.
     *
     * @throws BusinessRuleException si la cantidad no es positiva
     */
    public void addCopies(int quantity) {
        if (quantity < 1) {
            throw new BusinessRuleException("La cantidad a añadir debe ser al menos 1");
        }
        totalCopies += quantity;
        availableCopies += quantity;
    }

    /**
     * Forma canónica de título, autor y género: sin espacios al inicio o al final y con los
     * espacios internos repetidos reducidos a uno. Se guarda así para que la detección de
     * duplicados (que además ignora mayúsculas) sea fiable.
     */
    public static String normalize(String text) {
        return text == null ? "" : text.trim().replaceAll("\\s+", " ");
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

    /**
     * Getters: solo lectura. No hay setters públicos a propósito: los datos cambian únicamente
     * con los métodos de negocio de arriba, que validan las reglas.
     */
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
