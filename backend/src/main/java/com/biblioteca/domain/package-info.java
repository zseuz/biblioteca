/**
 * Modelo de dominio: entidades JPA que protegen sus propias invariantes.
 *
 * <p>Las reglas que dependen solo del estado de una entidad viven aquí (p. ej. no prestar
 * sin ejemplares disponibles). Las que necesitan consultar otros datos (p. ej. cuántos
 * préstamos activos tiene un usuario) viven en la capa de servicio.
 */
package com.biblioteca.domain;
