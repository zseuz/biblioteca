package com.biblioteca.dto;

import com.biblioteca.domain.Member;

/** Representación pública de un usuario de la biblioteca. */
public record MemberResponse(Long id, String name, String email) {

    /** Convierte la entidad en DTO. */
    public static MemberResponse from(Member m) {
        return new MemberResponse(m.getId(), m.getName(), m.getEmail());
    }
}
