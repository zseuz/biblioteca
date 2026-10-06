package com.biblioteca.service;

import com.biblioteca.dto.StatsResponse;
import com.biblioteca.dto.StatsResponse.Entry;
import com.biblioteca.repository.BookRepository;
import com.biblioteca.repository.LoanRepository;
import com.biblioteca.repository.MemberRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class StatsService {

    private static final int TOP = 5;

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
                entries(loans.topBooks(), TOP),
                entries(loans.loansByGenre(), Integer.MAX_VALUE),
                entries(loans.topMembers(), TOP));
    }

    private List<Entry> entries(List<Object[]> rows, int limit) {
        return rows.stream().limit(limit)
                .map(r -> new Entry((String) r[0], ((Number) r[1]).longValue()))
                .toList();
    }
}
