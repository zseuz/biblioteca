package com.biblioteca.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Datos de entrada para crear o actualizar un libro.
 *
 * <p>Las restricciones se validan con {@code @Valid} en el controlador, antes de llegar al
 * servicio. Las longitudes máximas coinciden con las columnas de la tabla {@code book}.
 *
 * @param title       título del libro (obligatorio, máx. 200 caracteres)
 * @param author      autor (obligatorio, máx. 150 caracteres)
 * @param genre       género o categoría (obligatorio, máx. 80 caracteres)
 * @param totalCopies ejemplares que posee la biblioteca (mínimo 1)
 */
public record BookRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 150) String author,
        @NotBlank @Size(max = 80) String genre,
        @Min(1) int totalCopies) {
}
