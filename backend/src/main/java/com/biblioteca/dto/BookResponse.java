package com.biblioteca.dto;

import com.biblioteca.domain.Book;

/**
 * Representación pública de un libro.
 *
 * @param availableCopies ejemplares que no están prestados en este momento
 * @param available       atajo para la interfaz: {@code true} si hay al menos un ejemplar libre
 */
public record BookResponse(Long id, String title, String author, String genre,
                           int totalCopies, int availableCopies, boolean available) {

    /** Convierte la entidad en DTO. Debe invocarse dentro de la transacción del servicio. */
    public static BookResponse from(Book b) {
        return new BookResponse(b.getId(), b.getTitle(), b.getAuthor(), b.getGenre(),
                b.getTotalCopies(), b.getAvailableCopies(), b.isAvailable());
    }
}
