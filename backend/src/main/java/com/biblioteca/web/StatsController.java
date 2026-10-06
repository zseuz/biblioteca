package com.biblioteca.web;

import com.biblioteca.dto.StatsResponse;
import com.biblioteca.service.StatsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Panel de estadísticas de la biblioteca (solo lectura). */
@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService service;

    public StatsController(StatsService service) {
        this.service = service;
    }

    /** {@code GET /api/stats}: totales, préstamos vencidos y rankings. */
    @GetMapping
    public StatsResponse stats() {
        return service.compute();
    }
}
