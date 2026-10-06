package com.biblioteca.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class BookTest {

    @Test
    void updateKeepsCopiesOnLoanWhenChangingTotal() {
        Book book = new Book("Dune", "Frank Herbert", "Ciencia ficción", 3);
        book.borrowCopy();

        book.update("Dune", "Frank Herbert", "Ciencia ficción", 5);

        assertThat(book.getTotalCopies()).isEqualTo(5);
        assertThat(book.getAvailableCopies()).isEqualTo(4);
    }

    @Test
    void updateRejectsTotalBelowCopiesOnLoan() {
        Book book = new Book("Dune", "Frank Herbert", "Ciencia ficción", 3);
        book.borrowCopy();
        book.borrowCopy();

        assertThatThrownBy(() -> book.update("Dune", "Frank Herbert", "Ciencia ficción", 1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void cannotBorrowWithoutAvailableCopies() {
        Book book = new Book("Dune", "Frank Herbert", "Ciencia ficción", 1);
        book.borrowCopy();

        assertThat(book.isAvailable()).isFalse();
        assertThatThrownBy(book::borrowCopy).isInstanceOf(IllegalStateException.class);
    }
}
