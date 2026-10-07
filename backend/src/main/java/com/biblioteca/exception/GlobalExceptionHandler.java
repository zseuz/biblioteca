package com.biblioteca.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Traduce excepciones a respuestas JSON con un formato único ({@link ApiError}):
 * <pre>{ "timestamp", "status", "message", "path", "fields"? }</pre>
 *
 * <p>Política: los errores del cliente (4xx) se registran a nivel DEBUG/WARN y devuelven un
 * mensaje útil; los inesperados (5xx) se registran con traza completa y devuelven un mensaje
 * genérico, para no filtrar detalles internos (SQL, clases, rutas) al exterior.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Registro de los errores en la consola del servidor. */
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** El recurso pedido no existe → 404 con el mensaje del servicio. */
    @ExceptionHandler(NotFoundException.class)
    ResponseEntity<ApiError> notFound(NotFoundException ex, HttpServletRequest req) {
        return body(HttpStatus.NOT_FOUND, ex.getMessage(), req, null);
    }

    /** Parámetro con un valor no admitido (p. ej. un orden inexistente) → 400. */
    @ExceptionHandler(BadRequestException.class)
    ResponseEntity<ApiError> badRequest(BadRequestException ex, HttpServletRequest req) {
        return body(HttpStatus.BAD_REQUEST, ex.getMessage(), req, null);
    }

    /**
     * Regla de negocio incumplida (libro agotado, máximo de préstamos…) → 409. Es un caso
     * esperado, por eso se registra solo a nivel DEBUG.
     */
    @ExceptionHandler(BusinessRuleException.class)
    ResponseEntity<ApiError> businessRule(BusinessRuleException ex, HttpServletRequest req) {
        log.debug("Regla de negocio rechazada en {}: {}", req.getRequestURI(), ex.getMessage());
        return body(HttpStatus.CONFLICT, ex.getMessage(), req, null);
    }

    /** Dos peticiones modificaron el mismo registro a la vez (ver {@code @Version}). */
    @ExceptionHandler(OptimisticLockingFailureException.class)
    ResponseEntity<ApiError> concurrentUpdate(OptimisticLockingFailureException ex, HttpServletRequest req) {
        log.warn("Conflicto de concurrencia en {}", req.getRequestURI());
        return body(HttpStatus.CONFLICT,
                "Otro usuario modificó estos datos al mismo tiempo. Actualiza e inténtalo de nuevo.", req, null);
    }

    /** Violación de una restricción de BD (p. ej. correo único en altas simultáneas). */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiError> integrity(DataIntegrityViolationException ex, HttpServletRequest req) {
        log.warn("Violación de integridad en {}: {}", req.getRequestURI(), ex.getMostSpecificCause().getMessage());
        return body(HttpStatus.CONFLICT, "La operación entra en conflicto con datos existentes", req, null);
    }

    /**
     * Falló una validación del cuerpo (@NotBlank, @Size…) → 400 con el error de cada campo en
     * {@code fields}, para que la interfaz pueda mostrarlo junto al campo.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> invalid(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(e -> fields.putIfAbsent(e.getField(), e.getDefaultMessage()));
        return body(HttpStatus.BAD_REQUEST, "Datos inválidos", req, fields);
    }

    /** El cuerpo no es JSON válido o un tipo no coincide (texto donde va un número) → 400. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> unreadable(HttpMessageNotReadableException ex, HttpServletRequest req) {
        return body(HttpStatus.BAD_REQUEST, "El cuerpo de la petición no es JSON válido", req, null);
    }

    /** Un valor de la URL no tiene el tipo esperado (p. ej. /api/books/abc) → 400. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiError> typeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest req) {
        return body(HttpStatus.BAD_REQUEST, "Valor inválido para '" + ex.getName() + "'", req, null);
    }

    /** Falta un parámetro obligatorio de la URL (p. ej. {@code bookId}): error del cliente, no del servidor. */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    ResponseEntity<ApiError> missingParameter(MissingServletRequestParameterException ex, HttpServletRequest req) {
        return body(HttpStatus.BAD_REQUEST, "Falta el parámetro obligatorio '" + ex.getParameterName() + "'", req, null);
    }

    /** Verbo HTTP no admitido en esa ruta (p. ej. PATCH) → 405. */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiError> methodNotAllowed(HttpRequestMethodNotSupportedException ex, HttpServletRequest req) {
        return body(HttpStatus.METHOD_NOT_ALLOWED, ex.getMessage(), req, null);
    }

    /** Ruta inexistente → 404 con el mismo formato JSON que el resto de errores. */
    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiError> noRoute(NoResourceFoundException ex, HttpServletRequest req) {
        return body(HttpStatus.NOT_FOUND, "Recurso no encontrado", req, null);
    }

    /** Red de seguridad: cualquier error no previsto. */
    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected(Exception ex, HttpServletRequest req) {
        log.error("Error no controlado en {} {}", req.getMethod(), req.getRequestURI(), ex);
        return body(HttpStatus.INTERNAL_SERVER_ERROR, "Error interno del servidor", req, null);
    }

    /**
     * Construye la respuesta con el formato común {@link ApiError}: fecha, código, mensaje, ruta
     * y, si los hay, los errores por campo.
     */
    private ResponseEntity<ApiError> body(HttpStatus status, String message,
                                          HttpServletRequest req, Map<String, String> fields) {
        ApiError error = new ApiError(Instant.now().toString(), status.value(), message, req.getRequestURI(), fields);
        return ResponseEntity.status(status).body(error);
    }
}
