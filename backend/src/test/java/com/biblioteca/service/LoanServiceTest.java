package com.biblioteca.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.biblioteca.domain.Book;
import com.biblioteca.domain.Loan;
import com.biblioteca.domain.Member;
import com.biblioteca.dto.LoanRequest;
import com.biblioteca.exception.BusinessRuleException;
import com.biblioteca.repository.LoanRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class LoanServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 3, 10);

    private LoanRepository loans;
    private BookService bookService;
    private MemberService memberService;
    private LoanService service;
    private Book book;
    private Member member;

    @BeforeEach
    void setUp() {
        loans = mock(LoanRepository.class);
        bookService = mock(BookService.class);
        memberService = mock(MemberService.class);
        Clock clock = Clock.fixed(Instant.parse("2026-03-10T10:00:00Z"), ZoneOffset.UTC);
        service = new LoanService(loans, bookService, memberService, clock);

        book = new Book("Dune", "Frank Herbert", "Ciencia ficción", 1);
        member = new Member("Ana", "ana@example.com");
        ReflectionTestUtils.setField(book, "id", 1L);
        ReflectionTestUtils.setField(member, "id", 2L);
        when(bookService.get(1L)).thenReturn(book);
        when(memberService.get(2L)).thenReturn(member);
        when(loans.save(any(Loan.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void lendsBookForFourteenDaysAndDecrementsStock() {
        Loan loan = service.lend(new LoanRequest(1L, 2L));

        assertThat(loan.getLoanDate()).isEqualTo(TODAY);
        assertThat(loan.getDueDate()).isEqualTo(TODAY.plusDays(14));
        assertThat(book.getAvailableCopies()).isZero();
    }

    @Test
    void rejectsWhenNoCopiesAvailable() {
        book.borrowCopy();

        assertThatThrownBy(() -> service.lend(new LoanRequest(1L, 2L)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("ejemplares");
    }

    @Test
    void rejectsWhenMemberReachedMaxActiveLoans() {
        when(loans.countByMemberIdAndReturnDateIsNull(2L)).thenReturn((long) LoanService.MAX_ACTIVE_LOANS);

        assertThatThrownBy(() -> service.lend(new LoanRequest(1L, 2L)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("máximo");
        assertThat(book.getAvailableCopies()).isEqualTo(1);
    }

    @Test
    void rejectsWhenMemberHasOverdueLoans() {
        when(loans.existsByMemberIdAndReturnDateIsNullAndDueDateBefore(2L, TODAY)).thenReturn(true);

        assertThatThrownBy(() -> service.lend(new LoanRequest(1L, 2L)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("vencidos");
    }

    @Test
    void returnRestoresStockAndCannotBeRepeated() {
        book.borrowCopy();
        Loan loan = new Loan(book, member, TODAY.minusDays(3), TODAY.plusDays(11));
        when(loans.findById(anyLong())).thenReturn(Optional.of(loan));

        service.giveBack(5L);

        assertThat(loan.getReturnDate()).isEqualTo(TODAY);
        assertThat(book.getAvailableCopies()).isEqualTo(1);
        assertThatThrownBy(() -> service.giveBack(5L)).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void loanIsOverdueOnlyAfterDueDateWhileActive() {
        Loan loan = new Loan(book, member, TODAY.minusDays(20), TODAY.minusDays(6));

        assertThat(loan.isOverdue(TODAY)).isTrue();
        assertThat(loan.isOverdue(TODAY.minusDays(6))).isFalse();
        loan.markReturned(TODAY);
        assertThat(loan.isOverdue(TODAY)).isFalse();
    }
}
