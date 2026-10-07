package com.biblioteca.repository;

import com.biblioteca.domain.Loan;
import com.biblioteca.dto.MemberLoanCount;
import com.biblioteca.dto.MonthCount;
import com.biblioteca.dto.StatEntry;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LoanRepository extends JpaRepository<Loan, Long> {

    /** Historial completo con libro y usuario en una sola consulta (evita el problema N+1). */
    @Query("select l from Loan l join fetch l.book join fetch l.member order by l.loanDate desc, l.id desc")
    List<Loan> findAllWithDetails();

    /** Un préstamo con sus relaciones ya cargadas, listo para mapearse a DTO. */
    @Query("select l from Loan l join fetch l.book join fetch l.member where l.id = :id")
    Optional<Loan> findByIdWithDetails(Long id);

    // Consultas derivadas del nombre del método. "ReturnDateIsNull" equivale a "préstamo activo".

    /** Préstamos activos del usuario (regla del máximo simultáneo). */
    long countByMemberIdAndReturnDateIsNull(Long memberId);

    /** ¿Tiene el usuario algún préstamo activo con fecha límite anterior a {@code date}? */
    boolean existsByMemberIdAndReturnDateIsNullAndDueDateBefore(Long memberId, LocalDate date);

    /** ¿Tiene el usuario historial de préstamos? (impide su eliminación) */
    boolean existsByMemberId(Long memberId);

    /** Préstamos registrados de un usuario (histórico). */
    long countByMemberId(Long memberId);

    /**
     * Contadores de préstamos de todos los usuarios con al menos uno, en una sola consulta
     * (evita N+1 al listar). {@code count(case ...)} solo cuenta los préstamos sin devolver.
     */
    @Query("""
            select new com.biblioteca.dto.MemberLoanCount(
                l.member.id, count(l), count(case when l.returnDate is null then 1 end))
            from Loan l group by l.member.id
            """)
    List<MemberLoanCount> loanCountsByMember();

    /** ¿Tiene el libro historial de préstamos? (impide su eliminación) */
    boolean existsByBookId(Long bookId);

    /** Total de préstamos activos. */
    long countByReturnDateIsNull();

    /** Total de préstamos activos vencidos a la fecha {@code date}. */
    long countByReturnDateIsNullAndDueDateBefore(LocalDate date);

    /** Total de préstamos ya devueltos. */
    long countByReturnDateIsNotNull();

    /**
     * Préstamos iniciados por mes desde {@code from} (inclusive). Los meses sin préstamos no
     * aparecen; {@code StatsService} los rellena con cero para que la serie sea continua.
     */
    @Query("""
            select new com.biblioteca.dto.MonthCount(year(l.loanDate), month(l.loanDate), count(l))
            from Loan l where l.loanDate >= :from
            group by year(l.loanDate), month(l.loanDate)
            """)
    List<MonthCount> countPerMonthSince(@Param("from") LocalDate from);

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
