package com.biblioteca.service;

import com.biblioteca.dto.StatsResponse;
import com.biblioteca.repository.BookRepository;
import com.biblioteca.repository.LoanRepository;
import com.biblioteca.repository.MemberRepository;
import java.time.Clock;
import java.time.LocalDate;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Indicadores del panel de estadísticas. Todas las agregaciones se calculan en la base de
 * datos (COUNT/GROUP BY con LIMIT), así el coste no crece con el tamaño del historial en memoria.
 */
@Service
@Transactional(readOnly = true)
public class StatsService {

    /** Tamaño de los rankings «top». */
    private static final Pageable TOP = Pageable.ofSize(5);

    private final BookRepository books;
    private final MemberRepository members;
    private final LoanRepository loans;
    private final Clock clock;

    public StatsService(BookRepository books, MemberRepository members, LoanRepository loans, Clock clock) {
        this.books = books;
        this.members = members;
        this.loans = loans;
        this.clock = clock;
    }

    public StatsResponse compute() {
        return new StatsResponse(
                books.count(),
                members.count(),
                loans.countByReturnDateIsNull(),
                loans.countByReturnDateIsNullAndDueDateBefore(LocalDate.now(clock)),
                loans.topBooks(TOP),
                loans.loansByGenre(),
                loans.topMembers(TOP));
    }
}
