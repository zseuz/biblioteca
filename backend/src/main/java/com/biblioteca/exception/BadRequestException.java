package com.biblioteca.exception;

/**
 * Parámetros de la petición con un valor no admitido (p. ej. un campo de orden desconocido).
 * {@link GlobalExceptionHandler} la traduce a HTTP 400.
 */
public class BadRequestException extends RuntimeException {

    /** @param message explicación para el cliente; se devuelve tal cual en el campo «message» (400). */
    public BadRequestException(String message) {
        super(message);
    }
}
