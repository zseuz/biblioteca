package com.biblioteca.web;

import com.biblioteca.dto.StatsResponse;
import com.biblioteca.service.StatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Panel de estadísticas de la biblioteca (solo lectura). */
@Tag(name = "Estadísticas")
@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService service;

    public StatsController(StatsService service) {
        this.service = service;
    }

    @Operation(summary = "Obtener las estadísticas",
            description = "Totales, préstamos vencidos y devueltos, serie de los últimos 6 meses y rankings. "
                    + "Todo se agrega en la base de datos.")
    @GetMapping
    public StatsResponse stats() {
        return service.compute();
    }
}
