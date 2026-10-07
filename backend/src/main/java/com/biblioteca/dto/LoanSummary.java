package com.biblioteca.dto;

/**
 * Contadores de préstamos por estado (pestañas e indicadores de la pantalla de préstamos).
 * Se calculan en una sola consulta agregada, sin cargar el historial.
 *
 * @param total    todos los préstamos registrados
 * @param active   sin devolver y dentro de plazo
 * @param overdue  sin devolver y fuera de plazo
 * @param returned devueltos
 */
public record LoanSummary(long total, long active, long overdue, long returned) {
}
