package com.biblioteca.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Historial de renovaciones de un préstamo, con los datos del préstamo inicial arriba.
 *
 * @param loan               estado actual del préstamo
 * @param originalDueDate    fecha límite con la que se registró el préstamo (antes de renovarlo)
 * @param renewals           renovaciones con detalle, de la más antigua a la más reciente
 * @param unrecordedRenewals renovaciones hechas antes de que se guardara el historial (sin detalle)
 */
public record LoanRenewalHistory(LoanResponse loan, LocalDate originalDueDate, List<Entry> renewals,
                                 int unrecordedRenewals) {

    /**
     * Una renovación.
     *
     * @param number          número de renovación (1 = la primera)
     * @param renewedAt       fecha y hora en que se renovó
     * @param previousDueDate fecha límite antes de renovar
     * @param newDueDate      fecha límite después de renovar
     * @param daysAdded       días que se ganaron con la renovación
     */
    public record Entry(int number, LocalDateTime renewedAt, LocalDate previousDueDate, LocalDate newDueDate,
                        long daysAdded) {
    }
}
