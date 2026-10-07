package com.biblioteca.service;

import com.biblioteca.domain.Book;
import com.biblioteca.dto.BookDuplicateCheck;
import com.biblioteca.dto.BookRequest;
import com.biblioteca.dto.BookResponse;
import com.biblioteca.exception.BusinessRuleException;
import com.biblioteca.exception.NotFoundException;
import com.biblioteca.repository.BookRepository;
import com.biblioteca.repository.LoanRepository;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Casos de uso del catálogo.
 *
 * <p>Los métodos públicos devuelven DTOs, nunca entidades: el mapeo ocurre dentro de la
 * transacción, así la capa web no puede disparar cargas perezosas sin sesión abierta.
 */
@Service
@Transactional
public class BookService {

    private static final Logger log = LoggerFactory.getLogger(BookService.class);

    private final BookRepository books;
    private final LoanRepository loans;

    public BookService(BookRepository books, LoanRepository loans) {
        this.books = books;
        this.loans = loans;
    }

    /** Busca por título, autor o género (sin distinguir mayúsculas). Vacío o nulo devuelve todo. */
    @Transactional(readOnly = true)
    public List<BookResponse> search(String query) {
        String q = query == null ? "" : query.trim();
        return books.search(q).stream().map(BookResponse::from).toList();
    }

    /**
     * Obtiene un libro por su identificador.
     *
     * @throws NotFoundException si el libro no existe
     */
    @Transactional(readOnly = true)
    public BookResponse get(Long id) {
        return BookResponse.from(find(id));
    }

    /**
     * Comprueba si un libro ya está registrado antes de crearlo (sin distinguir mayúsculas ni
     * espacios sobrantes). Separa la coincidencia exacta de las que solo difieren en el género.
     */
    @Transactional(readOnly = true)
    public BookDuplicateCheck checkDuplicates(String title, String author, String genre) {
        String normalizedGenre = Book.normalize(genre);
        BookResponse same = null;
        List<BookResponse> otherGenres = new ArrayList<>();
        for (Book b : books.findSameTitleAndAuthor(Book.normalize(title), Book.normalize(author))) {
            if (same == null && b.getGenre().equalsIgnoreCase(normalizedGenre)) {
                same = BookResponse.from(b);
            } else {
                otherGenres.add(BookResponse.from(b));
            }
        }
        return new BookDuplicateCheck(same, otherGenres);
    }

    /**
     * Da de alta un libro con todos sus ejemplares disponibles.
     *
     * @throws BusinessRuleException si ya existe un libro con el mismo título, autor y género
     *                               (en ese caso se deben añadir ejemplares al existente)
     */
    public BookResponse create(BookRequest r) {
        String title = Book.normalize(r.title());
        String author = Book.normalize(r.author());
        String genre = Book.normalize(r.genre());
        ensureNotDuplicated(title, author, genre, null);
        Book book = books.save(new Book(title, author, genre, r.totalCopies()));
        log.info("Libro creado id={} título='{}'", book.getId(), book.getTitle());
        return BookResponse.from(book);
    }

    /**
     * Actualiza los datos de un libro conservando los ejemplares prestados.
     *
     * @throws NotFoundException     si el libro no existe
     * @throws BusinessRuleException si el nuevo total es menor que los ejemplares prestados o si
     *                               los nuevos datos coinciden con otro libro ya registrado
     */
    public BookResponse update(Long id, BookRequest r) {
        Book book = find(id);
        String title = Book.normalize(r.title());
        String author = Book.normalize(r.author());
        String genre = Book.normalize(r.genre());
        ensureNotDuplicated(title, author, genre, id);
        book.update(title, author, genre, r.totalCopies());
        return BookResponse.from(book); // dirty checking: Hibernate persiste el cambio al hacer commit
    }

    /**
     * Añade ejemplares nuevos a un libro existente (todos quedan disponibles).
     *
     * @throws NotFoundException si el libro no existe
     */
    public BookResponse addCopies(Long id, int quantity) {
        Book book = find(id);
        book.addCopies(quantity);
        log.info("Ejemplares añadidos libro id={} +{} (total {})", id, quantity, book.getTotalCopies());
        return BookResponse.from(book);
    }

    /** Impide que haya dos libros con el mismo título, autor y género (sin distinguir mayúsculas). */
    private void ensureNotDuplicated(String title, String author, String genre, Long excludeId) {
        books.findSameTitleAndAuthor(title, author).stream()
                .filter(b -> b.getGenre().equalsIgnoreCase(genre) && !b.getId().equals(excludeId))
                .findFirst()
                .ifPresent(existing -> {
                    throw new BusinessRuleException("Ya existe «%s» de %s con el género «%s» (id %d). "
                            .formatted(existing.getTitle(), existing.getAuthor(), existing.getGenre(), existing.getId())
                            + "Añade ejemplares a ese libro en lugar de registrarlo otra vez.");
                });
    }

    /**
     * Elimina un libro. Se rechaza si tiene historial de préstamos para no perder trazabilidad
     * (y porque la FK lo impediría igualmente).
     */
    public void delete(Long id) {
        Book book = find(id);
        if (loans.existsByBookId(id)) {
            throw new BusinessRuleException("No se puede eliminar un libro con historial de préstamos");
        }
        books.delete(book);
        log.info("Libro eliminado id={}", id);
    }

    private Book find(Long id) {
        return books.findById(id).orElseThrow(() -> new NotFoundException("Libro no encontrado: " + id));
    }
}
