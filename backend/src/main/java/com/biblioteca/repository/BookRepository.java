package com.biblioteca.repository;

import com.biblioteca.domain.Book;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookRepository extends JpaRepository<Book, Long> {

    // Columnas en minÃºscula y sin tildes (constantes: se usan dentro de la anotaciÃ³n @Query).
    String TITLE = "cast(function('translate', lower(b.title), '" + TextSearch.ACCENTS + "', '" + TextSearch.PLAIN + "') as string)";
    String AUTHOR = "cast(function('translate', lower(b.author), '" + TextSearch.ACCENTS + "', '" + TextSearch.PLAIN + "') as string)";
    String GENRE = "cast(function('translate', lower(b.genre), '" + TextSearch.ACCENTS + "', '" + TextSearch.PLAIN + "') as string)";

    /**
     * BÃºsqueda parcial en tÃ­tulo, autor y gÃ©nero, sin distinguir mayÃºsculas ni tildes.
     *
     * @param pattern patrÃ³n {@code LIKE} ya normalizado ({@link TextSearch#containsPattern}); si
     *                {@code all} es verdadero se ignora y se devuelve todo el catÃ¡logo
     */
    @Query("select b from Book b where :all = true"
            + " or " + TITLE + " like :pattern escape '\\'"
            + " or " + AUTHOR + " like :pattern escape '\\'"
            + " or " + GENRE + " like :pattern escape '\\'"
            + " order by b.title")
    List<Book> search(@Param("all") boolean all, @Param("pattern") String pattern);

    /**
     * Libros con el mismo tÃ­tulo y autor (sin distinguir mayÃºsculas), de cualquier gÃ©nero.
     * Los valores llegan normalizados ({@link Book#normalize}), igual que se guardan.
     */
    @Query("""
            select b from Book b
            where lower(b.title) = lower(:title) and lower(b.author) = lower(:author)
            order by b.id
            """)
    List<Book> findSameTitleAndAuthor(@Param("title") String title, @Param("author") String author);
}
