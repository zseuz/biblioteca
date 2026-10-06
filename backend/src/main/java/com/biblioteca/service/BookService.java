package com.biblioteca.service;

import com.biblioteca.domain.Book;
import com.biblioteca.dto.BookRequest;
import com.biblioteca.exception.BusinessRuleException;
import com.biblioteca.exception.NotFoundException;
import com.biblioteca.repository.BookRepository;
import com.biblioteca.repository.LoanRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class BookService {

    private final BookRepository books;
    private final LoanRepository loans;

    public BookService(BookRepository books, LoanRepository loans) {
        this.books = books;
        this.loans = loans;
    }

    @Transactional(readOnly = true)
    public List<Book> list(String query) {
        return books.search(query);
    }

    @Transactional(readOnly = true)
    public Book get(Long id) {
        return books.findById(id).orElseThrow(() -> new NotFoundException("Libro no encontrado: " + id));
    }

    public Book create(BookRequest r) {
        return books.save(new Book(r.title().trim(), r.author().trim(), r.genre().trim(), r.totalCopies()));
    }

    public Book update(Long id, BookRequest r) {
        Book book = get(id);
        book.update(r.title().trim(), r.author().trim(), r.genre().trim(), r.totalCopies());
        return book;
    }

    public void delete(Long id) {
        Book book = get(id);
        if (loans.existsByBookId(id)) {
            throw new BusinessRuleException("No se puede eliminar un libro con historial de préstamos");
        }
        books.delete(book);
    }
}
