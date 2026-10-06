/**
 * Casos de uso de la aplicación.
 *
 * <p>Cada servicio define el límite transaccional ({@code @Transactional}) y devuelve DTOs,
 * de modo que ninguna entidad sale de la transacción. Así se evitan las cargas perezosas
 * fuera de sesión y las consultas ocultas durante la serialización.
 */
package com.biblioteca.service;
