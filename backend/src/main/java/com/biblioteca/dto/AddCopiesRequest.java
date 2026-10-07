package com.biblioteca.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Ejemplares nuevos que se incorporan a un libro existente.
 *
 * @param quantity cantidad a añadir (de 1 a 1000)
 */
public record AddCopiesRequest(
        @Min(value = 1, message = "La cantidad debe ser al menos 1")
        @Max(value = 1000, message = "La cantidad no puede superar 1000")
        int quantity) {
}
