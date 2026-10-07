package com.biblioteca.dto;

import com.biblioteca.exception.BadRequestException;
import java.util.Arrays;
import java.util.Locale;

/**
 * Criterios de búsqueda paginada del historial de préstamos.
 *
 * @param status    filtro por estado
 * @param text      texto a buscar en el título del libro o el nombre del usuario (vacío = todos)
 * @param sort      campo de ordenación
 * @param ascending sentido del orden
 * @param page      página (desde 0)
 * @param size      tamaño de página, acotado a [1, {@value #MAX_SIZE}]
 */
public record LoanQuery(StatusFilter status, String text, SortField sort, boolean ascending, int page, int size) {

    public static final int DEFAULT_SIZE = 10;
    public static final int MAX_SIZE = 100;

    /** Normaliza los valores recibidos: nunca página negativa ni tamaños fuera de rango. */
    public LoanQuery {
        text = text == null ? "" : text.trim();
        page = Math.max(0, page);
        size = Math.min(Math.max(1, size), MAX_SIZE);
    }

    /**
     * Construye los criterios a partir de los parámetros HTTP (texto libre).
     *
     * <p>Sin {@code sort} se ordena por fecha de préstamo, del más reciente al más antiguo. Si se
     * indica {@code sort} sin {@code direction}, el sentido es ascendente.
     *
     * @throws BadRequestException si el estado, el campo de orden o el sentido no son válidos
     */
    public static LoanQuery fromParams(String status, String text, String sort, String direction, int page, int size) {
        return new LoanQuery(
                StatusFilter.parse(status),
                text,
                SortField.parse(sort),
                parseAscending(direction, sort == null || sort.isBlank()),
                page,
                size);
    }

    private static boolean parseAscending(String direction, boolean defaultSort) {
        if (direction == null || direction.isBlank()) {
            return !defaultSort; // orden por defecto: los más recientes primero
        }
        return switch (direction.toLowerCase(Locale.ROOT)) {
            case "asc" -> true;
            case "desc" -> false;
            default -> throw new BadRequestException("direction debe ser 'asc' o 'desc'");
        };
    }

    /** Filtros por estado. "Activo" excluye los vencidos, igual que el campo {@code status} de la respuesta. */
    public enum StatusFilter {
        ALL, ACTIVE, OVERDUE, RETURNED;

        static StatusFilter parse(String value) {
            if (value == null || value.isBlank()) return ALL;
            try {
                return valueOf(value.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("status debe ser uno de " + Arrays.toString(values()));
            }
        }
    }

    /**
     * Campos por los que se puede ordenar. Es una lista blanca: el parámetro del cliente nunca se
     * concatena en la consulta, solo se elige una de estas expresiones (sin riesgo de inyección).
     */
    public enum SortField {
        BOOK_TITLE("bookTitle", "lower(b.title)"),
        MEMBER_NAME("memberName", "lower(m.name)"),
        LOAN_DATE("loanDate", "l.loanDate"),
        DUE_DATE("dueDate", "l.dueDate"),
        /** Mismo orden que en la interfaz: ACTIVE < OVERDUE < RETURNED. */
        STATUS("status", "case when l.returnDate is not null then 2 when l.dueDate < :today then 1 else 0 end");

        private final String param;
        private final String jpql;

        SortField(String param, String jpql) {
            this.param = param;
            this.jpql = jpql;
        }

        public String jpql() {
            return jpql;
        }

        static SortField parse(String value) {
            if (value == null || value.isBlank()) return LOAN_DATE;
            return Arrays.stream(values())
                    .filter(f -> f.param.equals(value.trim()))
                    .findFirst()
                    .orElseThrow(() -> new BadRequestException(
                            "sort debe ser uno de bookTitle, memberName, loanDate, dueDate, status"));
        }
    }
}
