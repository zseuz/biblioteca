package com.biblioteca.web;

import com.biblioteca.dto.AddCopiesRequest;
import com.biblioteca.dto.BookDuplicateCheck;
import com.biblioteca.dto.BookRequest;
import com.biblioteca.dto.BookResponse;
import com.biblioteca.exception.ApiError;
import com.biblioteca.service.BookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Catálogo de libros. Capa HTTP fina: valida la entrada y delega en {@link BookService}. */
@Tag(name = "Libros")
@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookService service;

    public BookController(BookService service) {
        this.service = service;
    }

    @Operation(summary = "Listar o buscar libros",
            description = "Sin `q` devuelve todo el catálogo ordenado por título. Con `q` busca en título, "
                    + "autor y género sin distinguir mayúsculas.")
    @GetMapping
    public List<BookResponse> search(
            @Parameter(description = "Texto a buscar", example = "garcía") @RequestParam(required = false) String q) {
        return service.search(q);
    }

    @Operation(summary = "Comprobar si un libro ya existe",
            description = "Antes de registrar un libro: `sameBook` es el que tiene el mismo título, autor y género "
                    + "(se le pueden añadir ejemplares) y `differentGenre` los que solo cambian en el género. "
                    + "No distingue mayúsculas ni espacios sobrantes.")
    @GetMapping("/duplicates")
    public BookDuplicateCheck duplicates(
            @Parameter(example = "Cien años de soledad") @RequestParam String title,
            @Parameter(example = "Gabriel García Márquez") @RequestParam String author,
            @Parameter(example = "Novela") @RequestParam(defaultValue = "") String genre) {
        return service.checkDuplicates(title, author, genre);
    }

    @Operation(summary = "Añadir ejemplares a un libro existente",
            description = "Incrementa el total y los disponibles. Es la alternativa a registrar de nuevo un libro que ya existe.")
    @ApiResponse(responseCode = "200", description = "Libro con los ejemplares actualizados")
    @ApiResponse(responseCode = "400", description = "Cantidad fuera de rango (1-1000)",
            content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "404", description = "No existe", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @PostMapping("/{id}/copies")
    public BookResponse addCopies(@PathVariable Long id, @Valid @RequestBody AddCopiesRequest request) {
        return service.addCopies(id, request.quantity());
    }

    @Operation(summary = "Obtener un libro")
    @ApiResponse(responseCode = "200", description = "Libro encontrado")
    @ApiResponse(responseCode = "404", description = "No existe", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @GetMapping("/{id}")
    public BookResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @Operation(summary = "Crear un libro", description = "Todos los ejemplares quedan disponibles. No se permite "
            + "registrar dos veces el mismo título, autor y género: en ese caso hay que añadir ejemplares.")
    @ApiResponse(responseCode = "201", description = "Libro creado")
    @ApiResponse(responseCode = "400", description = "Datos inválidos", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "409", description = "Ya existe un libro con el mismo título, autor y género",
            content = @Content(schema = @Schema(implementation = ApiError.class)))
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookResponse create(@Valid @RequestBody BookRequest request) {
        return service.create(request);
    }

    @Operation(summary = "Editar un libro", description = "Conserva los ejemplares que están prestados.")
    @ApiResponse(responseCode = "200", description = "Libro actualizado")
    @ApiResponse(responseCode = "400", description = "Datos inválidos", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "404", description = "No existe", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "409", description = "El total sería menor que los prestados, o los datos coinciden con otro libro",
            content = @Content(schema = @Schema(implementation = ApiError.class)))
    @PutMapping("/{id}")
    public BookResponse update(@PathVariable Long id, @Valid @RequestBody BookRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Eliminar un libro", description = "Solo libros sin historial de préstamos.")
    @ApiResponse(responseCode = "204", description = "Libro eliminado")
    @ApiResponse(responseCode = "404", description = "No existe", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "409", description = "Tiene historial de préstamos",
            content = @Content(schema = @Schema(implementation = ApiError.class)))
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
