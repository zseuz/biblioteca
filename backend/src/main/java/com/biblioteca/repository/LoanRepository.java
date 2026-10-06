package com.biblioteca.repository;

import com.biblioteca.domain.Loan;
import com.biblioteca.dto.StatEntry;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface LoanRepository extends JpaRepository<Loan, Long> {

    /** Historial completo con libro y usuario en una sola consulta (evita el problema N+1). */
    @Query("select l from Loan l join fetch l.book join fetch l.member order by l.loanDate desc, l.id desc")
    List<Loan> findAllWithDetails();

    /** Un préstamo con sus relaciones ya cargadas, listo para mapearse a DTO. */
    @Query("select l from Loan l join fetch l.book join fetch l.member where l.id = :id")
    Optional<Loan> findByIdWithDetails(Long id);

    long countByMemberIdAndReturnDateIsNull(Long memberId);

    boolean existsByMemberIdAndReturnDateIsNullAndDueDateBefore(Long memberId, LocalDate date);

    boolean existsByMemberId(Long memberId);

    boolean existsByBookId(Long bookId);

    long countByReturnDateIsNull();

    long countByReturnDateIsNullAndDueDateBefore(LocalDate date);

    // Estadísticas: agregación y límite resueltos en la BD; solo viajan las filas necesarias.
    // El segundo criterio de orden hace el resultado determinista cuando hay empates.

    @Query("""
            select new com.biblioteca.dto.StatEntry(l.book.title, count(l))
            from Loan l group by l.book.id, l.book.title
            order by count(l) desc, l.book.title
            """)
    List<StatEntry> topBooks(Pageable limit);

    @Query("""
            select new com.biblioteca.dto.StatEntry(l.book.genre, count(l))
            from Loan l group by l.book.genre
            order by count(l) desc, l.book.genre
            """)
    List<StatEntry> loansByGenre();

    @Query("""
            select new com.biblioteca.dto.StatEntry(l.member.name, count(l))
            from Loan l group by l.member.id, l.member.name
            order by count(l) desc, l.member.name
            """)
    List<StatEntry> topMembers(Pageable limit);
}
