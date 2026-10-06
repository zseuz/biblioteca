package com.biblioteca.exception;

/** Se lanza cuando una operación viola una regla de negocio (p. ej. límite de préstamos). */
public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) {
        super(message);
    }
}
