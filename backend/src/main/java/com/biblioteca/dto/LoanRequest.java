package com.biblioteca.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Solicitud de préstamo.
 *
 * <p>Las fechas no se reciben del cliente: el servidor las calcula con su propio reloj y el
 * plazo configurado, de modo que no pueden manipularse desde fuera.
 *
 * @param bookId   libro que se presta
 * @param memberId usuario que lo recibe
 */
public record LoanRequest(@NotNull Long bookId, @NotNull Long memberId) {
}
