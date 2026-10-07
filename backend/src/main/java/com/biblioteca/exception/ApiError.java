package com.biblioteca.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Map;

/**
 * Cuerpo de todas las respuestas de error de la API.
 *
 * @param fields errores por campo; solo aparece en los 400 de validación
 */
@Schema(description = "Formato común de los errores de la API")
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        @Schema(example = "2026-10-06T21:00:00Z") String timestamp,
        @Schema(example = "409") int status,
        @Schema(example = "No hay ejemplares disponibles de «Dune»") String message,
        @Schema(example = "/api/loans") String path,
        @Schema(example = "{\"name\": \"El nombre no puede superar los 100 caracteres\"}") Map<String, String> fields) {
}
