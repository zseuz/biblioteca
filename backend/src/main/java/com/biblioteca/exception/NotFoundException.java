package com.biblioteca.exception;

/** El recurso solicitado no existe. {@link GlobalExceptionHandler} la traduce a HTTP 404. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
