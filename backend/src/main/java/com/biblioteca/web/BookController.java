package com.biblioteca.web;

import com.biblioteca.dto.BookRequest;
import com.biblioteca.dto.BookResponse;
import com.biblioteca.service.BookService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Catálogo de libros. Capa HTTP fina: valida la entrada y delega en {@link BookService}. */
@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookService service;

    public BookController(BookService service) {
        this.service = service;
    }

    /** {@code GET /api/books?q=texto}: lista el catálogo o busca por título, autor o género. 200. */
    @GetMapping
    public List<BookResponse> search(@RequestParam(required = false) String q) {
        return service.search(q);
    }

    /** {@code GET /api/books/{id}}: 200, o 404 si no existe. */
    @GetMapping("/{id}")
    public BookResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    /** {@code POST /api/books}: 201 con el libro creado, o 400 si los datos no son válidos. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookResponse create(@Valid @RequestBody BookRequest request) {
        return service.create(request);
    }

    /** {@code PUT /api/books/{id}}: 200, 400 (validación), 404 o 409 (total menor que los prestados). */
    @PutMapping("/{id}")
    public BookResponse update(@PathVariable Long id, @Valid @RequestBody BookRequest request) {
        return service.update(id, request);
    }

    /** {@code DELETE /api/books/{id}}: 204, 404, o 409 si tiene historial de préstamos. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
