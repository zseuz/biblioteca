package com.biblioteca.dto;

/**
 * Par etiqueta/valor de una estadística (p. ej. «Novela» → 12 préstamos).
 * Se construye directamente desde JPQL ({@code select new ...}) para no materializar entidades.
 */
public record StatEntry(String label, long count) {
}
