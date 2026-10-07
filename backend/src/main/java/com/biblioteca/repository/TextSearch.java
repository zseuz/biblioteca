package com.biblioteca.repository;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Utilidades para buscar texto sin distinguir mayúsculas ni tildes («garcia» encuentra «García»).
 *
 * <p>La base de datos no ignora las tildes por sí sola, así que se hace en los dos lados de la
 * comparación: el texto buscado se normaliza en Java ({@link #normalize}) y la columna se pasa
 * por la función {@code translate} de la base de datos ({@link #unaccented}), que cambia cada
 * letra acentuada por su equivalente sin acento.
 */
public final class TextSearch {

    /** Letras acentuadas habituales en español (y en otras lenguas románicas), en minúscula. */
    static final String ACCENTS = "áéíóúüñàèìòùâêîôûäëïöç";
    /** Equivalente sin acento de cada letra de {@link #ACCENTS}, en el mismo orden. */
    static final String PLAIN = "aeiouunaeiouaeiouaeioc";

    /** Clase de utilidades estáticas: no se crean instancias. */
    private TextSearch() {
    }

    /**
     * Expresión JPQL que devuelve la columna en minúscula y sin tildes, para compararla con un
     * texto ya normalizado con {@link #normalize}. Ejemplo: {@code unaccented("b.title")}.
     */
    public static String unaccented(String column) {
        return "cast(function('translate', lower(" + column + "), '" + ACCENTS + "', '" + PLAIN + "') as string)";
    }

    /** Minúsculas y sin tildes ni otras marcas diacríticas ({@code "Díaz"} → {@code "diaz"}). */
    public static String normalize(String text) {
        if (text == null) {
            return "";
        }
        return Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT);
    }

    /** Patrón {@code LIKE} «contiene» sobre el texto normalizado; % y _ se buscan como texto. */
    public static String containsPattern(String text) {
        String escaped = normalize(text).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
