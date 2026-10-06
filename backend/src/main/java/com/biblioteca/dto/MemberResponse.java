package com.biblioteca.dto;

import com.biblioteca.domain.Member;

public record MemberResponse(Long id, String name, String email) {

    public static MemberResponse from(Member m) {
        return new MemberResponse(m.getId(), m.getName(), m.getEmail());
    }
}
