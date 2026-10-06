package com.biblioteca.repository;

import com.biblioteca.domain.Book;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookRepository extends JpaRepository<Book, Long> {

    @Query("""
            select b from Book b
            where :q is null or :q = ''
               or lower(b.title) like lower(concat('%', :q, '%'))
               or lower(b.author) like lower(concat('%', :q, '%'))
               or lower(b.genre) like lower(concat('%', :q, '%'))
            order by b.title
            """)
    List<Book> search(@Param("q") String q);
}
