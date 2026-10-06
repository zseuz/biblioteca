package com.biblioteca.repository;

import com.biblioteca.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;

/** Los correos se guardan normalizados ({@link Member#normalize}), por eso basta la igualdad exacta. */
public interface MemberRepository extends JpaRepository<Member, Long> {

    boolean existsByEmail(String email);

    boolean existsByEmailAndIdNot(String email, Long id);
}
