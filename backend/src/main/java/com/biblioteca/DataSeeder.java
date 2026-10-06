package com.biblioteca;

import com.biblioteca.domain.Book;
import com.biblioteca.domain.Member;
import com.biblioteca.dto.LoanRequest;
import com.biblioteca.repository.BookRepository;
import com.biblioteca.repository.MemberRepository;
import com.biblioteca.service.LoanService;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/** Datos de ejemplo para poder probar la app sin cargar nada a mano. */
@Configuration
@Profile("!test")
class DataSeeder {

    @Bean
    CommandLineRunner seed(BookRepository books, MemberRepository members, LoanService loans) {
        return args -> {
            if (books.count() > 0) {
                return;
            }
            List<Book> b = books.saveAll(List.of(
                    new Book("Cien años de soledad", "Gabriel García Márquez", "Novela", 3),
                    new Book("El amor en los tiempos del cólera", "Gabriel García Márquez", "Novela", 2),
                    new Book("Clean Code", "Robert C. Martin", "Tecnología", 2),
                    new Book("Sapiens", "Yuval Noah Harari", "Historia", 1),
                    new Book("El principito", "Antoine de Saint-Exupéry", "Fábula", 4),
                    new Book("Dune", "Frank Herbert", "Ciencia ficción", 2)));
            List<Member> m = members.saveAll(List.of(
                    new Member("Ana Torres", "ana@example.com"),
                    new Member("Luis Pérez", "luis@example.com"),
                    new Member("María Gómez", "maria@example.com")));
            loans.lend(new LoanRequest(b.get(0).getId(), m.get(0).getId()));
            loans.lend(new LoanRequest(b.get(2).getId(), m.get(0).getId()));
            loans.lend(new LoanRequest(b.get(0).getId(), m.get(1).getId()));
            loans.giveBack(loans.lend(new LoanRequest(b.get(4).getId(), m.get(2).getId())).getId());
        };
    }
}
