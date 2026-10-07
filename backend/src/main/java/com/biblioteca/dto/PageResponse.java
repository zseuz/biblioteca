package com.biblioteca.dto;

import java.util.List;
import java.util.function.Function;

/**
 * Página de resultados con un contrato JSON estable y explícito.
 *
 * <p>Se usa en lugar de serializar {@code org.springframework.data.domain.Page} directamente,
 * cuyo formato JSON es interno de Spring y puede cambiar entre versiones.
 *
 * @param page          número de página, empezando en 0
 * @param size          tamaño de página solicitado
 * @param totalElements total de elementos que cumplen los filtros
 * @param totalPages    total de páginas
 */
public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {

    /**
     * Crea la página calculando el número total de páginas a partir del total de elementos
     * (por ejemplo, 33 préstamos de 10 en 10 son 4 páginas).
     */
    public static <T> PageResponse<T> of(List<T> content, int page, int size, long totalElements) {
        int totalPages = size == 0 ? 0 : (int) Math.ceil((double) totalElements / size);
        return new PageResponse<>(content, page, size, totalElements, totalPages);
    }

    /** Transforma el contenido conservando los datos de paginación. */
    public <R> PageResponse<R> map(Function<T, R> mapper) {
        return new PageResponse<>(content.stream().map(mapper).toList(), page, size, totalElements, totalPages);
    }
}
