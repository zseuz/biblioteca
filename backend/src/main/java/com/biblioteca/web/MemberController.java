package com.biblioteca.web;

import com.biblioteca.dto.MemberRequest;
import com.biblioteca.dto.MemberResponse;
import com.biblioteca.exception.ApiError;
import com.biblioteca.service.MemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Usuarios de la biblioteca. Delega toda la lógica en {@link MemberService}. */
@Tag(name = "Usuarios")
@RestController
@RequestMapping("/api/members")
public class MemberController {

    /** Servicio con la lógica de usuarios; el controlador solo traduce HTTP ↔ Java. */
    private final MemberService service;

    /** Spring inyecta el servicio por constructor. */
    public MemberController(MemberService service) {
        this.service = service;
    }

    /** GET /api/members → usuarios con su número de préstamos activos y totales. */
    @Operation(summary = "Listar usuarios",
            description = "Ordenados por nombre, con sus contadores de préstamos (`activeLoans`, `totalLoans`).")
    @GetMapping
    public List<MemberResponse> list() {
        return service.list();
    }

    /** POST /api/members → crea el usuario (201); 409 si el correo ya existe. */
    @Operation(summary = "Registrar un usuario",
            description = "Nombre de hasta 100 caracteres y correo único (sin distinguir mayúsculas).")
    @ApiResponse(responseCode = "201", description = "Usuario creado")
    @ApiResponse(responseCode = "400", description = "Datos inválidos", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "409", description = "Correo ya registrado", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MemberResponse create(@Valid @RequestBody MemberRequest request) {
        return service.create(request);
    }

    /** PUT /api/members/{id} → cambia nombre y correo (409 si el correo es de otro usuario). */
    @Operation(summary = "Editar un usuario")
    @ApiResponse(responseCode = "200", description = "Usuario actualizado")
    @ApiResponse(responseCode = "400", description = "Datos inválidos", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "404", description = "No existe", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "409", description = "El correo pertenece a otro usuario",
            content = @Content(schema = @Schema(implementation = ApiError.class)))
    @PutMapping("/{id}")
    public MemberResponse update(@PathVariable Long id, @Valid @RequestBody MemberRequest request) {
        return service.update(id, request);
    }

    /** DELETE /api/members/{id} → borra el usuario (204) si no tiene préstamos; si tiene, 409. */
    @Operation(summary = "Eliminar un usuario", description = "Solo usuarios sin historial de préstamos.")
    @ApiResponse(responseCode = "204", description = "Usuario eliminado")
    @ApiResponse(responseCode = "404", description = "No existe", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "409", description = "Tiene historial de préstamos",
            content = @Content(schema = @Schema(implementation = ApiError.class)))
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
