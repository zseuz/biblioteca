package com.biblioteca.repository;

import com.biblioteca.domain.Loan;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface LoanRepository extends JpaRepository<Loan, Long> {

    @Query("select l from Loan l join fetch l.book join fetch l.member order by l.loanDate desc, l.id desc")
    List<Loan> findAllWithDetails();

    long countByMemberIdAndReturnDateIsNull(Long memberId);

    long countByBookIdAndReturnDateIsNull(Long bookId);

    boolean existsByMemberIdAndReturnDateIsNullAndDueDateBefore(Long memberId, LocalDate date);

    boolean existsByMemberId(Long memberId);

    boolean existsByBookId(Long bookId);

    long countByReturnDateIsNull();

    long countByReturnDateIsNullAndDueDateBefore(LocalDate date);

    @Query("select l.book.title, count(l) from Loan l group by l.book.title order by count(l) desc")
    List<Object[]> topBooks();

    @Query("select l.book.genre, count(l) from Loan l group by l.book.genre order by count(l) desc")
    List<Object[]> loansByGenre();

    @Query("select l.member.name, count(l) from Loan l group by l.member.name order by count(l) desc")
    List<Object[]> topMembers();
}
