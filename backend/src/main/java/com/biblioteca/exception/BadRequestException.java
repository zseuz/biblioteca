package com.biblioteca.exception;

/**
 * Parámetros de la petición con un valor no admitido (p. ej. un campo de orden desconocido).
 * {@link GlobalExceptionHandler} la traduce a HTTP 400.
 */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
