package com.biblioteca.exception;

/** El recurso solicitado no existe. {@link GlobalExceptionHandler} la traduce a HTTP 404. */
public class NotFoundException extends RuntimeException {

    /** @param message qué no se encontró, p. ej. «Libro no encontrado: 7» (404). */
    public NotFoundException(String message) {
        super(message);
    }
}
