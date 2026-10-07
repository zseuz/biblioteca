package com.biblioteca.service;

import com.biblioteca.dto.MonthCount;
import com.biblioteca.dto.StatEntry;
import com.biblioteca.dto.StatsResponse;
import com.biblioteca.repository.BookRepository;
import com.biblioteca.repository.LoanRepository;
import com.biblioteca.repository.MemberRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Indicadores del panel de estadísticas. Todas las agregaciones se calculan en la base de
 * datos (COUNT/GROUP BY con LIMIT), así el coste no crece con el tamaño del historial en memoria.
 */
@Service
@Transactional(readOnly = true)
public class StatsService {

    /** Tamaño de los rankings «top». */
    private static final Pageable TOP = Pageable.ofSize(5);
    /** Meses que cubre la serie temporal, incluido el actual. */
    static final int MONTHS = 6;

    /** Repositorios de los que salen los contadores y rankings. */
    private final BookRepository books;
    private final MemberRepository members;
    private final LoanRepository loans;
    /** Reloj inyectado para calcular vencidos y el mes actual (fijo en las pruebas). */
    private final Clock clock;

    /** Inyección por constructor de los repositorios y el reloj. */
    public StatsService(BookRepository books, MemberRepository members, LoanRepository loans, Clock clock) {
        this.books = books;
        this.members = members;
        this.loans = loans;
        this.clock = clock;
    }

    /**
     * Calcula todo el panel en una llamada: totales de libros y usuarios, préstamos en plazo,
     * vencidos y devueltos, la serie de los últimos meses y los rankings. Cada dato sale de una
     * consulta de agregación en la base, sin cargar todos los registros en memoria.
     */
    public StatsResponse compute() {
        LocalDate today = LocalDate.now(clock);
        long overdue = loans.countByReturnDateIsNullAndDueDateBefore(today);
        return new StatsResponse(
                books.count(),
                members.count(),
                loans.countByReturnDateIsNull() - overdue, // activos = en plazo, sin contar los vencidos
                overdue,
                loans.countByReturnDateIsNotNull(),
                loansByMonth(YearMonth.from(today)),
                loans.topBooks(TOP),
                loans.loansByGenre(),
                loans.topMembers(TOP));
    }

    /**
     * Serie continua de los últimos {@link #MONTHS} meses. La BD solo devuelve los meses con
     * préstamos; aquí se rellenan los huecos con 0 para que la gráfica no salte meses.
     */
    private List<StatEntry> loansByMonth(YearMonth current) {
        YearMonth first = current.minusMonths(MONTHS - 1L);
        Map<YearMonth, Long> counts = loans.countPerMonthSince(first.atDay(1)).stream()
                .collect(Collectors.toMap(MonthCount::yearMonth, MonthCount::count));

        List<StatEntry> series = new ArrayList<>(MONTHS);
        for (YearMonth m = first; !m.isAfter(current); m = m.plusMonths(1)) {
            series.add(new StatEntry(m.toString(), counts.getOrDefault(m, 0L)));
        }
        return series;
    }
}
