package com.biblioteca.dto;

import java.util.List;

/**
 * Panel de estadísticas.
 *
 * @param activeLoans   préstamos en plazo (sin devolver y con la fecha límite sin vencer); los vencidos
 *                      se cuentan aparte, igual que en {@code /api/loans/summary}
 * @param overdueLoans  préstamos sin devolver cuya fecha límite ya pasó
 * @param returnedLoans préstamos ya devueltos (histórico)
 * @param loansByMonth  préstamos iniciados en cada uno de los últimos meses, del más antiguo al
 *                      actual; {@code label} es el mes en formato ISO ({@code 2026-10}) y los
 *                      meses sin actividad vienen con 0, de modo que la serie es continua
 * @param topBooks      libros más prestados (histórico)
 * @param loansByGenre  préstamos agrupados por género (histórico)
 * @param topMembers    usuarios con más préstamos (histórico)
 */
public record StatsResponse(long totalBooks, long totalMembers, long activeLoans, long overdueLoans,
                            long returnedLoans, List<StatEntry> loansByMonth,
                            List<StatEntry> topBooks, List<StatEntry> loansByGenre, List<StatEntry> topMembers) {
}
