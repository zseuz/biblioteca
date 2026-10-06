package com.biblioteca.service;

import com.biblioteca.domain.Book;
import com.biblioteca.dto.BookRequest;
import com.biblioteca.dto.BookResponse;
import com.biblioteca.exception.BusinessRuleException;
import com.biblioteca.exception.NotFoundException;
import com.biblioteca.repository.BookRepository;
import com.biblioteca.repository.LoanRepository;
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

    @Transactional(readOnly = true)
    public BookResponse get(Long id) {
        return BookResponse.from(find(id));
    }

    public BookResponse create(BookRequest r) {
        Book book = books.save(new Book(r.title().trim(), r.author().trim(), r.genre().trim(), r.totalCopies()));
        log.info("Libro creado id={} título='{}'", book.getId(), book.getTitle());
        return BookResponse.from(book);
    }

    public BookResponse update(Long id, BookRequest r) {
        Book book = find(id);
        book.update(r.title().trim(), r.author().trim(), r.genre().trim(), r.totalCopies());
        return BookResponse.from(book); // dirty checking: Hibernate persiste el cambio al hacer commit
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
