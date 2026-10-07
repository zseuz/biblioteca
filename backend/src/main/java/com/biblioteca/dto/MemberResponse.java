package com.biblioteca.dto;

import com.biblioteca.domain.Member;

/**
 * Representación pública de un usuario de la biblioteca.
 *
 * <p>Incluye sus contadores de préstamos para que la interfaz sepa de antemano si se puede
 * eliminar (solo usuarios sin historial) y lo explique sin necesidad de intentarlo.
 *
 * @param activeLoans préstamos sin devolver
 * @param totalLoans  préstamos registrados en total (histórico)
 */
public record MemberResponse(Long id, String name, String email, long activeLoans, long totalLoans) {

    /** Convierte la entidad en DTO con sus contadores de préstamos. */
    public static MemberResponse from(Member m, long activeLoans, long totalLoans) {
        return new MemberResponse(m.getId(), m.getName(), m.getEmail(), activeLoans, totalLoans);
    }

    /** Usuario recién creado: todavía no tiene préstamos. */
    public static MemberResponse from(Member m) {
        return from(m, 0, 0);
    }
}
