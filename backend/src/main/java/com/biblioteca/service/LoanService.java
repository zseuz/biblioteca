package com.biblioteca.service;

import com.biblioteca.domain.Book;
import com.biblioteca.domain.Loan;
import com.biblioteca.domain.Member;
import com.biblioteca.dto.LoanRequest;
import com.biblioteca.exception.BusinessRuleException;
import com.biblioteca.exception.NotFoundException;
import com.biblioteca.repository.LoanRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reglas de préstamo:
 * - Un préstamo dura {@value #LOAN_DAYS} días.
 * - Un usuario puede tener como máximo {@value #MAX_ACTIVE_LOANS} préstamos activos.
 * - Un usuario con préstamos vencidos no puede pedir más libros.
 * - Solo se presta si hay ejemplares disponibles.
 */
@Service
@Transactional
public class LoanService {

    public static final int LOAN_DAYS = 14;
    public static final int MAX_ACTIVE_LOANS = 3;

    private final LoanRepository loans;
    private final BookService bookService;
    private final MemberService memberService;
    private final Clock clock;

    public LoanService(LoanRepository loans, BookService bookService, MemberService memberService, Clock clock) {
        this.loans = loans;
        this.bookService = bookService;
        this.memberService = memberService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<Loan> list() {
        return loans.findAllWithDetails();
    }

    public Loan lend(LoanRequest r) {
        Book book = bookService.get(r.bookId());
        Member member = memberService.get(r.memberId());
        LocalDate today = LocalDate.now(clock);

        if (!book.isAvailable()) {
            throw new BusinessRuleException("No hay ejemplares disponibles de «" + book.getTitle() + "»");
        }
        if (loans.existsByMemberIdAndReturnDateIsNullAndDueDateBefore(member.getId(), today)) {
            throw new BusinessRuleException("El usuario tiene préstamos vencidos pendientes de devolver");
        }
        if (loans.countByMemberIdAndReturnDateIsNull(member.getId()) >= MAX_ACTIVE_LOANS) {
            throw new BusinessRuleException("El usuario alcanzó el máximo de " + MAX_ACTIVE_LOANS + " préstamos activos");
        }

        book.borrowCopy();
        return loans.save(new Loan(book, member, today, today.plusDays(LOAN_DAYS)));
    }

    public Loan giveBack(Long loanId) {
        Loan loan = loans.findById(loanId)
                .orElseThrow(() -> new NotFoundException("Préstamo no encontrado: " + loanId));
        if (!loan.isActive()) {
            throw new BusinessRuleException("El préstamo ya fue devuelto");
        }
        loan.markReturned(LocalDate.now(clock));
        loan.getBook().returnCopy();
        return loan;
    }
}
