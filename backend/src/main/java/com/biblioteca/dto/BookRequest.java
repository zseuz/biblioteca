package com.biblioteca.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Datos de entrada para crear o actualizar un libro.
 *
 * <p>Las restricciones se validan con {@code @Valid} en el controlador, antes de llegar al
 * servicio. Los máximos coinciden con las columnas de la tabla {@code book}; los mínimos evitan
 * registros sin sentido (un autor de una letra). El frontend aplica los mismos límites
 * ({@code core/validators.ts}) para avisar antes de enviar.
 *
 * <p>Los textos se recortan (sin espacios al inicio ni al final) antes de validarse, así
 * «&nbsp;&nbsp;a&nbsp;&nbsp;» cuenta como 1 carácter y no como 5.
 *
 * @param title       título del libro (obligatorio, 2 a 200 caracteres)
 * @param author      autor (obligatorio, 3 a 150 caracteres)
 * @param genre       género o categoría (obligatorio, 3 a 80 caracteres)
 * @param totalCopies ejemplares que posee la biblioteca (1 a 1000)
 */
public record BookRequest(
        @NotBlank(message = "El título es obligatorio")
        @Size(min = 2, max = 200, message = "El título debe tener entre {min} y {max} caracteres")
        String title,
        @NotBlank(message = "El autor es obligatorio")
        @Size(min = 3, max = 150, message = "El autor debe tener entre {min} y {max} caracteres")
        String author,
        @NotBlank(message = "El género es obligatorio")
        @Size(min = 3, max = 80, message = "El género debe tener entre {min} y {max} caracteres")
        String genre,
        @Min(value = 1, message = "Debe haber al menos {value} ejemplar")
        @Max(value = 1000, message = "No puede haber más de {value} ejemplares")
        int totalCopies) {

    /** Recorta los textos antes de que se validen. */
    public BookRequest {
        title = trim(title);
        author = trim(author);
        genre = trim(genre);
    }

    private static String trim(String value) {
        return value == null ? null : value.trim();
    }
}
