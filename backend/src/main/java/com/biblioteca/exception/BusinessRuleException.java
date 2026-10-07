package com.biblioteca.exception;

/**
 * La petición es válida en forma pero viola una regla de negocio (sin ejemplares, límite de
 * préstamos, correo duplicado...).
 *
 * <p>{@link GlobalExceptionHandler} la traduce a HTTP 409 y su mensaje llega tal cual al
 * usuario final, por lo que debe redactarse de forma clara y en español.
 */
public class BusinessRuleException extends RuntimeException {

    /** @param message motivo de la regla incumplida; el usuario lo lee tal cual (409). */
    public BusinessRuleException(String message) {
        super(message);
    }
}
