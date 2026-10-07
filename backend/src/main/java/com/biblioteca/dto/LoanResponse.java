package com.biblioteca.dto;

import com.biblioteca.domain.Loan;
import java.time.LocalDate;

/**
 * Representación pública de un préstamo. Incluye el título del libro y el nombre del
 * usuario para que la interfaz no necesite peticiones adicionales.
 *
 * @param returnDate {@code null} mientras el préstamo siga activo
 * @param status     {@code ACTIVE}, {@code OVERDUE} (activo y fuera de plazo) o {@code RETURNED}
 * @param renewals   veces que se renovó (cada renovación vuelve a dar el plazo completo desde ese día)
 * @param lastRenewedOn fecha de la última renovación ({@code null} si nunca se renovó)
 */
public record LoanResponse(Long id, Long bookId, String bookTitle, Long memberId, String memberName,
                           LocalDate loanDate, LocalDate dueDate, LocalDate returnDate, String status,
                           int renewals, LocalDate lastRenewedOn) {

    /**
     * Convierte la entidad en DTO calculando su estado respecto a {@code today}.
     *
     * <p>Requiere que {@code book} y {@code member} estén inicializados: invocar dentro de la
     * transacción o sobre un préstamo cargado con {@code join fetch}.
     */
    public static LoanResponse from(Loan l, LocalDate today) {
        String status = !l.isActive() ? "RETURNED" : l.isOverdue(today) ? "OVERDUE" : "ACTIVE";
        return new LoanResponse(l.getId(), l.getBook().getId(), l.getBook().getTitle(),
                l.getMember().getId(), l.getMember().getName(),
                l.getLoanDate(), l.getDueDate(), l.getReturnDate(), status,
                l.getRenewals(), l.getLastRenewedOn());
    }
}
