package com.biblioteca.dto;

import com.biblioteca.domain.Loan;
import java.time.LocalDate;

public record LoanResponse(Long id, Long bookId, String bookTitle, Long memberId, String memberName,
                           LocalDate loanDate, LocalDate dueDate, LocalDate returnDate, String status) {

    /** status: ACTIVE, OVERDUE o RETURNED. */
    public static LoanResponse from(Loan l, LocalDate today) {
        String status = !l.isActive() ? "RETURNED" : l.isOverdue(today) ? "OVERDUE" : "ACTIVE";
        return new LoanResponse(l.getId(), l.getBook().getId(), l.getBook().getTitle(),
                l.getMember().getId(), l.getMember().getName(),
                l.getLoanDate(), l.getDueDate(), l.getReturnDate(), status);
    }
}
