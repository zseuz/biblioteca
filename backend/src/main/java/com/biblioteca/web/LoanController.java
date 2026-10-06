package com.biblioteca.web;

import com.biblioteca.dto.LoanRequest;
import com.biblioteca.dto.LoanResponse;
import com.biblioteca.service.LoanService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Préstamos. La devolución es una acción ({@code POST /{id}/return}) y no un {@code PUT}
 * genérico: el cliente no puede fijar fechas ni estados arbitrarios, solo pedir la transición.
 */
@RestController
@RequestMapping("/api/loans")
public class LoanController {

    private final LoanService service;

    public LoanController(LoanService service) {
        this.service = service;
    }

    /** {@code GET /api/loans}: historial completo, del más reciente al más antiguo. 200. */
    @GetMapping
    public List<LoanResponse> list() {
        return service.list();
    }

    /**
     * {@code POST /api/loans}: 201 con el préstamo creado; 400 (validación), 404 (libro o
     * usuario inexistente) o 409 (sin ejemplares, préstamos vencidos o límite alcanzado).
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LoanResponse lend(@Valid @RequestBody LoanRequest request) {
        return service.lend(request);
    }

    /** {@code POST /api/loans/{id}/return}: 200, 404, o 409 si ya estaba devuelto. */
    @PostMapping("/{id}/return")
    public LoanResponse giveBack(@PathVariable Long id) {
        return service.giveBack(id);
    }
}
