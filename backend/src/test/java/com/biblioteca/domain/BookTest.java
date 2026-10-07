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

    /** Al cambiar el total de ejemplares, los que están prestados se respetan: los disponibles = total nuevo − prestados. */
    @Test
    void updateKeepsCopiesOnLoanWhenChangingTotal() {
        Book book = new Book("Dune", "Frank Herbert", "Ciencia ficción", 3);
        book.borrowCopy();

        book.update("Dune", "Frank Herbert", "Ciencia ficción", 5);

        assertThat(book.getTotalCopies()).isEqualTo(5);
        assertThat(book.getAvailableCopies()).as("5 totales - 1 prestado").isEqualTo(4);
    }

    /** No se puede bajar el total por debajo de los ejemplares prestados (quedaría stock negativo). */
    @Test
    void updateRejectsTotalBelowCopiesOnLoan() {
        Book book = new Book("Dune", "Frank Herbert", "Ciencia ficción", 3);
        book.borrowCopy();
        book.borrowCopy();

        assertThatThrownBy(() -> book.update("Dune", "Frank Herbert", "Ciencia ficción", 1))
                .isInstanceOf(BusinessRuleException.class);
    }

    /** Un libro agotado no se puede prestar: borrowCopy() lanza la regla de negocio. */
    @Test
    void cannotBorrowWithoutAvailableCopies() {
        Book book = new Book("Dune", "Frank Herbert", "Ciencia ficción", 1);
        book.borrowCopy();

        assertThat(book.isAvailable()).isFalse();
        assertThatThrownBy(book::borrowCopy).isInstanceOf(BusinessRuleException.class);
    }

    /** Devolver un ejemplar nunca deja más disponibles que el total (protege ante una devolución repetida). */
    @Test
    void returnCopyNeverExceedsTotal() {
        Book book = new Book("Dune", "Frank Herbert", "Ciencia ficción", 1);

        book.returnCopy();

        assertThat(book.getAvailableCopies()).isEqualTo(1);
    }

    /** Sumar ejemplares aumenta a la vez el total y los disponibles; una cantidad no positiva se rechaza. */
    @Test
    void addCopiesIncreasesTotalAndAvailable() {
        Book book = new Book("Dune", "Frank Herbert", "Ciencia ficción", 1);
        book.borrowCopy();

        book.addCopies(2);

        assertThat(book.getTotalCopies()).isEqualTo(3);
        assertThat(book.getAvailableCopies()).as("los nuevos llegan disponibles").isEqualTo(2);
        assertThatThrownBy(() -> book.addCopies(0)).isInstanceOf(BusinessRuleException.class);
    }

    /** Los textos se guardan sin espacios sobrantes, para que la detección de duplicados sea fiable. */
    @Test
    void normalizeTrimsAndCollapsesWhitespace() {
        assertThat(Book.normalize("  Cien   años  de soledad ")).isEqualTo("Cien años de soledad");
        assertThat(Book.normalize(null)).isEmpty();
    }

    /** No se puede crear un libro con 0 ejemplares. */
    @Test
    void requiresAtLeastOneCopy() {
        assertThatThrownBy(() -> new Book("Dune", "Frank Herbert", "Ciencia ficción", 0))
                .isInstanceOf(BusinessRuleException.class);
    }
}
