package com.biblioteca.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.biblioteca.exception.BusinessRuleException;
import org.junit.jupiter.api.Test;

/**
 * Pruebas de las invariantes de {@link Book}: el stock disponible nunca es negativo
 * ni supera el total, y los ejemplares prestados se conservan al editar el libro.
 */
class BookTest {

    @Test
    void updateKeepsCopiesOnLoanWhenChangingTotal() {
        Book book = new Book("Dune", "Frank Herbert", "Ciencia ficción", 3);
        book.borrowCopy();

        book.update("Dune", "Frank Herbert", "Ciencia ficción", 5);

        assertThat(book.getTotalCopies()).isEqualTo(5);
        assertThat(book.getAvailableCopies()).as("5 totales - 1 prestado").isEqualTo(4);
    }

    @Test
    void updateRejectsTotalBelowCopiesOnLoan() {
        Book book = new Book("Dune", "Frank Herbert", "Ciencia ficción", 3);
        book.borrowCopy();
        book.borrowCopy();

        assertThatThrownBy(() -> book.update("Dune", "Frank Herbert", "Ciencia ficción", 1))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void cannotBorrowWithoutAvailableCopies() {
        Book book = new Book("Dune", "Frank Herbert", "Ciencia ficción", 1);
        book.borrowCopy();

        assertThat(book.isAvailable()).isFalse();
        assertThatThrownBy(book::borrowCopy).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void returnCopyNeverExceedsTotal() {
        Book book = new Book("Dune", "Frank Herbert", "Ciencia ficción", 1);

        book.returnCopy();

        assertThat(book.getAvailableCopies()).isEqualTo(1);
    }

    @Test
    void addCopiesIncreasesTotalAndAvailable() {
        Book book = new Book("Dune", "Frank Herbert", "Ciencia ficción", 1);
        book.borrowCopy();

        book.addCopies(2);

        assertThat(book.getTotalCopies()).isEqualTo(3);
        assertThat(book.getAvailableCopies()).as("los nuevos llegan disponibles").isEqualTo(2);
        assertThatThrownBy(() -> book.addCopies(0)).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void normalizeTrimsAndCollapsesWhitespace() {
        assertThat(Book.normalize("  Cien   años  de soledad ")).isEqualTo("Cien años de soledad");
        assertThat(Book.normalize(null)).isEmpty();
    }

    @Test
    void requiresAtLeastOneCopy() {
        assertThatThrownBy(() -> new Book("Dune", "Frank Herbert", "Ciencia ficción", 0))
                .isInstanceOf(BusinessRuleException.class);
    }
}
