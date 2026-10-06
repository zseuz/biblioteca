package com.biblioteca.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * Parámetros de negocio de la biblioteca, configurables sin recompilar
 * (por ejemplo {@code LIBRARY_LOANS_MAX_ACTIVE=5} como variable de entorno).
 * Un valor inválido hace fallar el arranque en lugar de producir un comportamiento extraño.
 */
@Validated
@ConfigurationProperties(prefix = "library")
public record LibraryProperties(@Valid @DefaultValue Loans loans) {

    /**
     * @param days      días de plazo de cada préstamo
     * @param maxActive máximo de préstamos activos simultáneos por usuario
     */
    public record Loans(@DefaultValue("14") @Min(1) int days, @DefaultValue("3") @Min(1) int maxActive) {
    }
}
