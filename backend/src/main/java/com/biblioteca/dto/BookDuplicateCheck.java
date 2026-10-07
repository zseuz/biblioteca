package com.biblioteca.dto;

import java.util.List;

/**
 * Resultado de comprobar si un libro ya existe antes de registrarlo.
 *
 * @param sameBook       libro con el mismo título, autor y género (o {@code null} si no hay):
 *                       en lugar de crear otro, se le pueden añadir ejemplares
 * @param differentGenre libros con el mismo título y autor pero otro género: se informa la
 *                       diferencia para que el usuario confirme si es correcta
 */
public record BookDuplicateCheck(BookResponse sameBook, List<BookResponse> differentGenre) {
}
