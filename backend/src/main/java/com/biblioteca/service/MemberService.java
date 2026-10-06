package com.biblioteca.service;

import com.biblioteca.domain.Member;
import com.biblioteca.dto.MemberRequest;
import com.biblioteca.dto.MemberResponse;
import com.biblioteca.exception.BusinessRuleException;
import com.biblioteca.exception.NotFoundException;
import com.biblioteca.repository.LoanRepository;
import com.biblioteca.repository.MemberRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Casos de uso de usuarios.
 *
 * <p>La comprobación previa de correo duplicado da un mensaje claro en el caso habitual;
 * la restricción {@code unique} de la BD cubre la carrera entre dos altas simultáneas
 * (se traduce a 409 en {@code GlobalExceptionHandler}).
 */
@Service
@Transactional
public class MemberService {

    private static final Logger log = LoggerFactory.getLogger(MemberService.class);
    private static final String DUPLICATE_EMAIL = "Ya existe un usuario con ese correo";

    private final MemberRepository members;
    private final LoanRepository loans;

    public MemberService(MemberRepository members, LoanRepository loans) {
        this.members = members;
        this.loans = loans;
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> list() {
        return members.findAll(Sort.by("name")).stream().map(MemberResponse::from).toList();
    }

    public MemberResponse create(MemberRequest r) {
        if (members.existsByEmail(Member.normalize(r.email()))) {
            throw new BusinessRuleException(DUPLICATE_EMAIL);
        }
        Member member = members.save(new Member(r.name(), r.email()));
        log.info("Usuario creado id={}", member.getId());
        return MemberResponse.from(member);
    }

    public MemberResponse update(Long id, MemberRequest r) {
        Member member = find(id);
        if (members.existsByEmailAndIdNot(Member.normalize(r.email()), id)) {
            throw new BusinessRuleException(DUPLICATE_EMAIL);
        }
        member.update(r.name(), r.email());
        return MemberResponse.from(member);
    }

    /** Elimina un usuario sin historial de préstamos (mismo criterio de trazabilidad que los libros). */
    public void delete(Long id) {
        Member member = find(id);
        if (loans.existsByMemberId(id)) {
            throw new BusinessRuleException("No se puede eliminar un usuario con historial de préstamos");
        }
        members.delete(member);
        log.info("Usuario eliminado id={}", id);
    }

    private Member find(Long id) {
        return members.findById(id).orElseThrow(() -> new NotFoundException("Usuario no encontrado: " + id));
    }
}
