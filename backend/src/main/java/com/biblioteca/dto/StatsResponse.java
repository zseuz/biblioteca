package com.biblioteca.dto;

import java.util.List;

/**
 * Panel de estadísticas.
 *
 * @param overdueLoans préstamos activos cuya fecha límite ya pasó
 * @param topBooks     libros más prestados (histórico)
 * @param loansByGenre préstamos agrupados por género (histórico)
 * @param topMembers   usuarios con más préstamos (histórico)
 */
public record StatsResponse(long totalBooks, long totalMembers, long activeLoans, long overdueLoans,
                            List<StatEntry> topBooks, List<StatEntry> loansByGenre, List<StatEntry> topMembers) {
}
