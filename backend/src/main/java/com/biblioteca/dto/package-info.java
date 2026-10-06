/**
 * Contratos de entrada y salida de la API REST, implementados como records inmutables.
 *
 * <p>Desacoplan el formato JSON del modelo de persistencia: se puede cambiar una entidad sin
 * romper a los clientes, y nunca se exponen campos internos como {@code version}.
 */
package com.biblioteca.dto;
