package com.biblioteca.repository;

import com.biblioteca.domain.Book;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookRepository extends JpaRepository<Book, Long> {

    /**
     * Búsqueda parcial e insensible a mayúsculas en título, autor y género.
     *
     * @param q texto ya recortado; cadena vacía devuelve todo el catálogo
     */
    @Query("""
            select b from Book b
            where :q = ''
               or lower(b.title) like lower(concat('%', :q, '%'))
               or lower(b.author) like lower(concat('%', :q, '%'))
               or lower(b.genre) like lower(concat('%', :q, '%'))
            order by b.title
            """)
    List<Book> search(@Param("q") String q);

    /**
     * Libros con el mismo título y autor (sin distinguir mayúsculas), de cualquier género.
     * Los valores llegan normalizados ({@link Book#normalize}), igual que se guardan.
     */
    @Query("""
            select b from Book b
            where lower(b.title) = lower(:title) and lower(b.author) = lower(:author)
            order by b.id
            """)
    List<Book> findSameTitleAndAuthor(@Param("title") String title, @Param("author") String author);
}
