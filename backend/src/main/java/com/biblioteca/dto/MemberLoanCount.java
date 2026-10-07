package com.biblioteca.dto;

/**
 * Resultado intermedio de la agregación de préstamos por usuario (proyección JPQL).
 * No se expone en la API: {@code MemberService} lo incorpora a {@link MemberResponse}.
 *
 * @param total  préstamos registrados del usuario (histórico)
 * @param active préstamos sin devolver
 */
public record MemberLoanCount(Long memberId, long total, long active) {
}
