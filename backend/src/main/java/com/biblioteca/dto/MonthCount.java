package com.biblioteca.dto;

import java.time.YearMonth;

/**
 * Resultado intermedio de la agregación mensual de préstamos (proyección JPQL).
 * No se expone en la API: {@code StatsService} lo convierte en {@link StatEntry}.
 */
public record MonthCount(int year, int month, long count) {

    public YearMonth yearMonth() {
        return YearMonth.of(year, month);
    }
}
