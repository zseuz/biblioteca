package com.biblioteca.service;

import com.biblioteca.domain.Member;
import com.biblioteca.dto.MemberRequest;
import com.biblioteca.exception.BusinessRuleException;
import com.biblioteca.exception.NotFoundException;
import com.biblioteca.repository.LoanRepository;
import com.biblioteca.repository.MemberRepository;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class MemberService {

    private final MemberRepository members;
    private final LoanRepository loans;

    public MemberService(MemberRepository members, LoanRepository loans) {
        this.members = members;
        this.loans = loans;
    }

    @Transactional(readOnly = true)
    public List<Member> list() {
        return members.findAll(Sort.by("name"));
    }

    @Transactional(readOnly = true)
    public Member get(Long id) {
        return members.findById(id).orElseThrow(() -> new NotFoundException("Usuario no encontrado: " + id));
    }

    public Member create(MemberRequest r) {
        if (members.existsByEmailIgnoreCase(r.email())) {
            throw new BusinessRuleException("Ya existe un usuario con ese correo");
        }
        return members.save(new Member(r.name().trim(), r.email().trim()));
    }

    public Member update(Long id, MemberRequest r) {
        Member member = get(id);
        if (members.existsByEmailIgnoreCaseAndIdNot(r.email(), id)) {
            throw new BusinessRuleException("Ya existe un usuario con ese correo");
        }
        member.update(r.name().trim(), r.email().trim());
        return member;
    }

    public void delete(Long id) {
        Member member = get(id);
        if (loans.existsByMemberId(id)) {
            throw new BusinessRuleException("No se puede eliminar un usuario con historial de préstamos");
        }
        members.delete(member);
    }
}
