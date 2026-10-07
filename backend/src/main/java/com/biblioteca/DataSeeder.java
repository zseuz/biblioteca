package com.biblioteca;

import com.biblioteca.config.LibraryProperties;
import com.biblioteca.domain.Book;
import com.biblioteca.domain.Loan;
import com.biblioteca.domain.Member;
import com.biblioteca.repository.BookRepository;
import com.biblioteca.repository.LoanRepository;
import com.biblioteca.repository.MemberRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Datos de demostración y registros de prueba. Nunca se ejecuta en el perfil {@code test}.
 *
 * <ol>
 *   <li><b>Demo</b> (solo con la BD vacía): catálogo, usuarios y seis meses de historial
 *       (devueltos, activos y uno vencido) para que el panel de estadísticas muestre tendencias
 *       desde el primer arranque. Las fechas son relativas a hoy, así que la demo no "caduca".</li>
 *   <li><b>Registros de prueba</b> (en cada arranque, idempotente): un libro <i>agotado</i> y un
 *       préstamo <i>vencido</i>, asociados a un usuario de prueba propio
 *       ({@value #TEST_MEMBER_EMAIL}). Se crean también en bases que ya tienen datos y no se
 *       duplican: si el usuario de prueba existe, no se hace nada.</li>
 *   <li><b>Préstamo renovado</b> (idempotente, con su propio usuario
 *       {@value #RENEWALS_MEMBER_EMAIL}): un préstamo activo con tres renovaciones en días
 *       distintos, para ver el historial de renovaciones.</li>
 *   <li><b>Préstamo renovable</b> (idempotente, usuario {@value #RENEWABLE_MEMBER_EMAIL}): un
 *       préstamo en plazo al que le quedan pocos días, para comprobar que ya se puede renovar.</li>
 * </ol>
 *
 * <p>Los préstamos se crean directamente (sin pasar por {@code LoanService}) porque el servicio
 * siempre usa la fecha actual y aquí se necesitan fechas pasadas; aun así respetan las
 * invariantes del dominio ({@code borrowCopy}/{@code markReturned}) y el máximo de préstamos
 * activos por usuario.
 */
@Configuration
@Profile("!test")
class DataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private static final int LOAN_DAYS = 14;
    static final String TEST_MEMBER_EMAIL = "prueba@biblioteca.test";
    static final String RENEWALS_MEMBER_EMAIL = "renovaciones@biblioteca.test";
    static final String RENEWABLE_MEMBER_EMAIL = "renovable@biblioteca.test";

    @Bean
    CommandLineRunner seed(BookRepository books, MemberRepository members, LoanRepository loans,
                           TransactionTemplate tx, Clock clock, LibraryProperties properties) {
        // Una sola transacción: los cambios de stock de los libros se guardan junto a los préstamos.
        return args -> tx.executeWithoutResult(status -> {
            LocalDate today = LocalDate.now(clock);
            if (books.count() == 0) {
                seedDemo(books, members, loans, today);
            }
            ensureTestRecords(books, members, loans, today);
            ensureRenewedLoan(books, members, loans, today, properties.loans());
            ensureRenewableLoan(books, members, loans, today, properties.loans());
        });
    }

    private void seedDemo(BookRepository books, MemberRepository members, LoanRepository loans, LocalDate today) {
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

        List<Loan> history = new ArrayList<>();

        // Historial devuelto: {libro, usuario, meses atrás, día del mes, días que lo tuvo}.
        int[][] returned = {
                {0, 0, 5, 3, 10}, {4, 2, 5, 18, 7},
                {0, 1, 4, 2, 12}, {2, 0, 4, 9, 14}, {5, 2, 4, 21, 9},
                {1, 0, 3, 5, 11}, {0, 2, 3, 12, 13}, {3, 1, 3, 20, 6},
                {0, 0, 2, 1, 8}, {2, 1, 2, 8, 14}, {4, 0, 2, 15, 5}, {5, 1, 2, 22, 12},
                {0, 1, 1, 4, 9}, {3, 2, 1, 11, 14}, {1, 2, 1, 19, 10},
        };
        for (int[] r : returned) {
            LocalDate start = today.minusMonths(r[2]).withDayOfMonth(r[3]);
            history.add(returnedLoan(b.get(r[0]), m.get(r[1]), start, r[4], today));
        }

        // Préstamos en curso: tres activos y uno vencido (venció hace 6 días).
        history.add(activeLoan(b.get(0), m.get(0), today.minusDays(3)));
        history.add(activeLoan(b.get(2), m.get(0), today.minusDays(1)));
        history.add(activeLoan(b.get(0), m.get(1), today.minusDays(5)));
        history.add(activeLoan(b.get(5), m.get(2), today.minusDays(LOAN_DAYS + 6)));

        loans.saveAll(history);
        log.info("Datos de demostración cargados: {} libros, {} usuarios, {} préstamos",
                b.size(), m.size(), history.size());
    }

    /**
     * Garantiza dos casos de prueba fáciles de localizar en la interfaz:
     * <ul>
     *   <li>"1984": un único ejemplar, prestado hace 2 días → libro <b>agotado</b> (préstamo al día).</li>
     *   <li>"Rayuela": prestado hace 20 días con plazo de 14 → préstamo <b>vencido</b> hace 6 días.</li>
     * </ul>
     */
    private void ensureTestRecords(BookRepository books, MemberRepository members, LoanRepository loans,
                                   LocalDate today) {
        if (members.existsByEmail(TEST_MEMBER_EMAIL)) {
            return;
        }
        Member tester = members.save(new Member("Usuario de Prueba", TEST_MEMBER_EMAIL));
        Book soldOut = books.save(new Book("1984", "George Orwell", "Distopía", 1));
        Book overdueBook = books.save(new Book("Rayuela", "Julio Cortázar", "Novela", 2));

        loans.saveAll(List.of(
                activeLoan(soldOut, tester, today.minusDays(2)),
                activeLoan(overdueBook, tester, today.minusDays(LOAN_DAYS + 6))));
        log.info("Registros de prueba creados: libro agotado «1984» y préstamo vencido de «Rayuela» ({})",
                TEST_MEMBER_EMAIL);
    }

    /**
     * "Fahrenheit 451": renovado tres veces y todavía activo. Cada renovación se hace el primer
     * día en que la regla lo permite (cuando faltan {@code renewalWindowDays} días para el
     * vencimiento), de modo que con el plazo y la ventana por defecto (14 y 5 días) el préstamo
     * se hizo hace 29 días y se renovó hace 20, 11 y 2 días, y vence dentro de 12.
     *
     * <p>Usa {@link Loan#renew}, así que el historial queda igual que si se hubiera renovado
     * desde la aplicación y las fechas siempre cumplen la regla, aunque se cambie la configuración.
     */
    private void ensureRenewedLoan(BookRepository books, MemberRepository members, LoanRepository loans,
                                   LocalDate today, LibraryProperties.Loans rules) {
        if (members.existsByEmail(RENEWALS_MEMBER_EMAIL)) {
            return;
        }
        int step = rules.days() - rules.renewalWindowDays(); // días entre una renovación y la siguiente
        if (step <= 0) {
            return; // con esta configuración renovar no amplía el plazo: no hay historial que simular
        }
        Member reader = members.save(new Member("Lector Renovaciones", RENEWALS_MEMBER_EMAIL));
        Book book = books.save(new Book("Fahrenheit 451", "Ray Bradbury", "Ciencia ficción", 2));

        LocalDate start = today.minusDays(2L + 3L * step); // la tercera renovación fue hace 2 días
        book.borrowCopy();
        Loan loan = new Loan(book, reader, start, start.plusDays(rules.days()));
        LocalDate renewalDay = loan.renewableFrom(rules.renewalWindowDays());
        int[][] times = {{9, 15}, {16, 40}, {11, 5}};
        for (int[] time : times) {
            loan.renew(renewalDay.atTime(time[0], time[1]), rules.days(), rules.renewalWindowDays());
            renewalDay = loan.renewableFrom(rules.renewalWindowDays());
        }
        loans.save(loan); // guarda también las renovaciones (cascade)
        log.info("Registro de prueba creado: «Fahrenheit 451» con 3 renovaciones ({})", RENEWALS_MEMBER_EMAIL);
    }

    /**
     * "Cumbres borrascosas": préstamo en plazo al que le quedan pocos días (3 con la ventana por
     * defecto de 5), por lo que <b>ya se puede renovar</b>. Sirve para comprobar la renovación;
     * los demás préstamos activos todavía no están en la ventana y muestran el aviso de «No es
     * posible renovar hasta…». La fecha se calcula con la configuración, así que sigue siendo
     * renovable aunque se cambie {@code renewal-window-days}.
     */
    private void ensureRenewableLoan(BookRepository books, MemberRepository members, LoanRepository loans,
                                     LocalDate today, LibraryProperties.Loans rules) {
        if (members.existsByEmail(RENEWABLE_MEMBER_EMAIL)) {
            return;
        }
        Member reader = members.save(new Member("Lector para Renovar", RENEWABLE_MEMBER_EMAIL));
        Book book = books.save(new Book("Cumbres borrascosas", "Emily Brontë", "Novela", 2));

        int daysLeft = Math.max(0, rules.renewalWindowDays() - 2);
        LocalDate start = today.minusDays((long) rules.days() - daysLeft);
        book.borrowCopy();
        loans.save(new Loan(book, reader, start, start.plusDays(rules.days())));
        log.info("Registro de prueba creado: «Cumbres borrascosas» renovable (vence en {} días) ({})",
                daysLeft, RENEWABLE_MEMBER_EMAIL);
    }

    private static Loan activeLoan(Book book, Member member, LocalDate start) {
        book.borrowCopy();
        return new Loan(book, member, start, start.plusDays(LOAN_DAYS));
    }

    private static Loan returnedLoan(Book book, Member member, LocalDate start, int daysKept, LocalDate today) {
        Loan loan = activeLoan(book, member, start);
        LocalDate returnedOn = start.plusDays(daysKept);
        // Nunca una devolución en el futuro (posible si hoy es principio de mes).
        loan.markReturned(returnedOn.isAfter(today) ? today : returnedOn); // repone el ejemplar
        return loan;
    }
}
