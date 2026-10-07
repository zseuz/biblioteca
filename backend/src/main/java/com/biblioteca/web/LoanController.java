package com.biblioteca.web;

import com.biblioteca.dto.LoanRequest;
import com.biblioteca.dto.LoanResponse;
import com.biblioteca.exception.ApiError;
import com.biblioteca.service.LoanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Préstamos")
@RestController
@RequestMapping("/api/loans")
public class LoanController {

    private final LoanService service;

    public LoanController(LoanService service) {
        this.service = service;
    }

    @Operation(summary = "Historial de préstamos", description = "Del más reciente al más antiguo. "
            + "`status`: ACTIVE (en plazo), OVERDUE (vencido) o RETURNED (devuelto).")
    @GetMapping
    public List<LoanResponse> list() {
        return service.list();
    }

    @Operation(summary = "Prestar un libro",
            description = "Reglas: debe haber ejemplares disponibles, el usuario no puede tener préstamos vencidos "
                    + "y no puede superar 3 préstamos activos. La fecha límite se calcula en el servidor (14 días).")
    @ApiResponse(responseCode = "201", description = "Préstamo registrado")
    @ApiResponse(responseCode = "400", description = "Datos inválidos", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "404", description = "Libro o usuario inexistente",
            content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "409", description = "Sin ejemplares, préstamos vencidos, límite alcanzado o conflicto de concurrencia",
            content = @Content(schema = @Schema(implementation = ApiError.class)))
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LoanResponse lend(@Valid @RequestBody LoanRequest request) {
        return service.lend(request);
    }

    @Operation(summary = "Registrar la devolución", description = "Repone el ejemplar en el stock del libro.")
    @ApiResponse(responseCode = "200", description = "Devolución registrada")
    @ApiResponse(responseCode = "404", description = "No existe", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "409", description = "El préstamo ya estaba devuelto",
            content = @Content(schema = @Schema(implementation = ApiError.class)))
    @PostMapping("/{id}/return")
    public LoanResponse giveBack(@PathVariable Long id) {
        return service.giveBack(id);
    }
}
