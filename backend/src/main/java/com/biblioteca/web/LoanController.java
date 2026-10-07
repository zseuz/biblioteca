package com.biblioteca.web;

import com.biblioteca.dto.LoanQuery;
import com.biblioteca.dto.LoanRenewalHistory;
import com.biblioteca.dto.LoanRequest;
import com.biblioteca.dto.LoanResponse;
import com.biblioteca.dto.LoanSummary;
import com.biblioteca.dto.PageResponse;
import com.biblioteca.exception.ApiError;
import com.biblioteca.service.LoanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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
import org.springframework.web.bind.annotation.RequestParam;
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

    /** Servicio con las reglas de préstamo; el controlador solo traduce HTTP ↔ Java. */
    private final LoanService service;

    /** Spring inyecta el servicio por constructor. */
    public LoanController(LoanService service) {
        this.service = service;
    }

    /**
     * GET /api/loans → una página del historial. Los parámetros llegan como texto y
     * {@link LoanQuery#fromParams} los valida (400 si alguno no es válido).
     */
    @Operation(summary = "Historial de préstamos (paginado)",
            description = "Filtros, búsqueda, orden y paginación se resuelven en la base de datos. "
                    + "`status` de cada préstamo: ACTIVE (en plazo), OVERDUE (vencido) o RETURNED (devuelto). "
                    + "`size` se acota entre 1 y 100.")
    @ApiResponse(responseCode = "200", description = "Página de préstamos")
    @ApiResponse(responseCode = "400", description = "Valor de status, sort o direction no admitido",
            content = @Content(schema = @Schema(implementation = ApiError.class)))
    @GetMapping
    public PageResponse<LoanResponse> search(
            @Parameter(description = "ALL, ACTIVE, OVERDUE o RETURNED", example = "OVERDUE")
            @RequestParam(defaultValue = "ALL") String status,
            @Parameter(description = "Texto en el título del libro o el nombre del usuario", example = "dune")
            @RequestParam(required = false) String q,
            @Parameter(description = "bookTitle, memberName, loanDate, dueDate o status. "
                    + "Por defecto loanDate (los préstamos más recientes primero)", example = "loanDate")
            @RequestParam(required = false) String sort,
            @Parameter(description = "asc o desc. Por defecto desc si no se indica sort; asc si se indica", example = "desc")
            @RequestParam(required = false) String direction,
            @Parameter(description = "Página, empezando en 0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Elementos por página (1-100)")
            @RequestParam(defaultValue = "" + LoanQuery.DEFAULT_SIZE) int size) {
        return service.search(LoanQuery.fromParams(status, q, sort, direction, page, size));
    }

    /** GET /api/loans/active → la web lo consulta antes de prestar para avisar de un préstamo repetido. */
    @Operation(summary = "Préstamos sin devolver de un usuario para un libro",
            description = "Sirve para avisar antes de prestar otra vez el mismo libro al mismo usuario.")
    @GetMapping("/active")
    public List<LoanResponse> activeFor(
            @Parameter(description = "Id del usuario", example = "1") @RequestParam Long memberId,
            @Parameter(description = "Id del libro", example = "1") @RequestParam Long bookId) {
        return service.activeLoansFor(memberId, bookId);
    }

    /** POST /api/loans/{id}/renew → renueva si faltan 5 días o menos para vencer; si no, 409 con la fecha. */
    @Operation(summary = "Renovar un préstamo",
            description = "Solo préstamos en plazo y cuando faltan 5 días o menos para el vencimiento (configurable): "
                    + "la fecha límite pasa a ser hoy + el plazo configurado (14 días). Antes de ese momento responde "
                    + "409 indicando desde qué fecha se podrá. Cada renovación queda en el historial con su fecha y hora.")
    @ApiResponse(responseCode = "200", description = "Préstamo renovado")
    @ApiResponse(responseCode = "404", description = "No existe", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "409", description = "Ya devuelto, vencido o todavía no es el momento de renovar",
            content = @Content(schema = @Schema(implementation = ApiError.class)))
    @PostMapping("/{id}/renew")
    public LoanResponse renew(@PathVariable Long id) {
        return service.renew(id);
    }

    /** GET /api/loans/{id}/renewals → préstamo inicial y cada renovación con fecha y hora. */
    @Operation(summary = "Historial de renovaciones",
            description = "Datos del préstamo inicial (fecha y vencimiento original) y cada renovación: "
                    + "fecha y hora, vencimiento anterior y nuevo.")
    @ApiResponse(responseCode = "200", description = "Historial")
    @ApiResponse(responseCode = "404", description = "No existe", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @GetMapping("/{id}/renewals")
    public LoanRenewalHistory renewals(@PathVariable Long id) {
        return service.renewalHistory(id);
    }

    /** GET /api/loans/summary → total, en plazo, vencidos y devueltos (pestañas e indicadores). */
    @Operation(summary = "Contadores por estado",
            description = "Total, activos (en plazo), vencidos y devueltos, en una sola consulta.")
    @GetMapping("/summary")
    public LoanSummary summary() {
        return service.summary();
    }

    /** POST /api/loans → registra el préstamo (201) si se cumplen todas las reglas; si no, 409 con el motivo. */
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

    /** POST /api/loans/{id}/return → marca el préstamo como devuelto y repone el ejemplar. */
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
