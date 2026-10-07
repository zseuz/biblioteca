package com.biblioteca.service;

import com.biblioteca.config.LibraryProperties;
import com.biblioteca.domain.Book;
import com.biblioteca.domain.Loan;
import com.biblioteca.domain.LoanRenewal;
import com.biblioteca.domain.Member;
import com.biblioteca.dto.LoanQuery;
import com.biblioteca.dto.LoanRenewalHistory;
import com.biblioteca.dto.LoanRequest;
import com.biblioteca.dto.LoanResponse;
import com.biblioteca.dto.LoanSummary;
import com.biblioteca.dto.PageResponse;
import com.biblioteca.exception.BusinessRuleException;
import com.biblioteca.exception.NotFoundException;
import com.biblioteca.repository.BookRepository;
import com.biblioteca.repository.LoanRepository;
import com.biblioteca.repository.MemberRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Préstamos y devoluciones.
 *
 * <p>Reglas (plazo y tope configurables en {@link LibraryProperties}):
 * <ol>
 *   <li>Solo se presta si el libro tiene ejemplares disponibles.</li>
 *   <li>Un usuario con préstamos vencidos no puede pedir más libros.</li>
 *   <li>Un usuario no puede superar el máximo de préstamos activos.</li>
 * </ol>
 *
 * <p>Concurrencia: {@code Book} y {@code Loan} tienen {@code @Version}. Si dos peticiones
 * compiten por el último ejemplar o por la misma devolución, una de ellas falla al hacer
 * commit y el cliente recibe 409 en lugar de corromperse el stock.
 */
@Service
@Transactional
public class LoanService {

    private static final Logger log = LoggerFactory.getLogger(LoanService.class);

    private final LoanRepository loans;
    private final BookRepository books;
    private final MemberRepository members;
    private final LibraryProperties.Loans rules;
    private final Clock clock;

    public LoanService(LoanRepository loans, BookRepository books, MemberRepository members,
                       LibraryProperties properties, Clock clock) {
        this.loans = loans;
        this.books = books;
        this.members = members;
        this.rules = properties.loans();
        this.clock = clock;
    }

    /**
     * Historial paginado con filtros, búsqueda y orden resueltos en la base de datos.
     * Se usa una sola fecha para la consulta y el mapeo, así filtros y estados son coherentes.
     */
    @Transactional(readOnly = true)
    public PageResponse<LoanResponse> search(LoanQuery query) {
        LocalDate today = today();
        return loans.search(query, today).map(l -> LoanResponse.from(l, today, rules.renewalWindowDays()));
    }

    /**
     * Préstamos sin devolver de un usuario para un libro. Permite avisar antes de prestarle
     * otra vez el mismo libro (se puede confirmar, cancelar o renovar el existente).
     */
    @Transactional(readOnly = true)
    public List<LoanResponse> activeLoansFor(Long memberId, Long bookId) {
        LocalDate today = today();
        return loans.findActiveByMemberAndBook(memberId, bookId).stream()
                .map(l -> LoanResponse.from(l, today, rules.renewalWindowDays()))
                .toList();
    }

    /**
     * Renueva un préstamo en plazo: vuelve a tener el plazo completo contando desde hoy.
     *
     * @throws NotFoundException     si el préstamo no existe
     * @throws BusinessRuleException si ya fue devuelto, está vencido o todavía faltan más de
     *                               {@code renewalWindowDays} días para el vencimiento
     */
    public LoanResponse renew(Long loanId) {
        Loan loan = findWithDetails(loanId);
        LocalDateTime now = LocalDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS);
        loan.renew(now, rules.days(), rules.renewalWindowDays());
        log.info("Renovación préstamo id={} nuevo vencimiento={} (renovación nº {})",
                loanId, loan.getDueDate(), loan.getRenewals());
        return LoanResponse.from(loan, now.toLocalDate(), rules.renewalWindowDays());
    }

    /**
     * Historial de renovaciones con los datos del préstamo inicial.
     *
     * <p>Los préstamos renovados antes de existir el historial tienen renovaciones sin detalle
     * ({@code unrecordedRenewals}); en ese caso el vencimiento original se deduce del plazo.
     *
     * @throws NotFoundException si el préstamo no existe
     */
    @Transactional(readOnly = true)
    public LoanRenewalHistory renewalHistory(Long loanId) {
        Loan loan = findWithDetails(loanId);
        List<LoanRenewal> history = loan.getRenewalHistory();
        int unrecorded = Math.max(0, loan.getRenewals() - history.size());

        LocalDate originalDueDate;
        if (unrecorded > 0) {
            originalDueDate = loan.getLoanDate().plusDays(rules.days());
        } else if (history.isEmpty()) {
            originalDueDate = loan.getDueDate();
        } else {
            originalDueDate = history.getFirst().getPreviousDueDate();
        }

        List<LoanRenewalHistory.Entry> entries = new ArrayList<>(history.size());
        for (int i = 0; i < history.size(); i++) {
            LoanRenewal r = history.get(i);
            entries.add(new LoanRenewalHistory.Entry(unrecorded + i + 1, r.getRenewedAt(),
                    r.getPreviousDueDate(), r.getNewDueDate(),
                    ChronoUnit.DAYS.between(r.getPreviousDueDate(), r.getNewDueDate())));
        }
        return new LoanRenewalHistory(LoanResponse.from(loan, today(), rules.renewalWindowDays()), originalDueDate, entries, unrecorded);
    }

    private Loan findWithDetails(Long loanId) {
        return loans.findByIdWithDetails(loanId)
                .orElseThrow(() -> new NotFoundException("Préstamo no encontrado: " + loanId));
    }

    /** Contadores por estado para las pestañas e indicadores. */
    @Transactional(readOnly = true)
    public LoanSummary summary() {
        return loans.summary(today());
    }

    /**
     * Presta un ejemplar aplicando las reglas descritas en la clase.
     *
     * @return el préstamo creado, con fecha límite calculada a partir del plazo configurado
     * @throws NotFoundException     si el libro o el usuario no existen
     * @throws BusinessRuleException si se incumple alguna regla de préstamo
     */
    public LoanResponse lend(LoanRequest r) {
        Book book = books.findById(r.bookId())
                .orElseThrow(() -> new NotFoundException("Libro no encontrado: " + r.bookId()));
        Member member = members.findById(r.memberId())
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado: " + r.memberId()));
        LocalDate today = today();

        // Las comprobaciones más baratas y más informativas primero.
        if (!book.isAvailable()) {
            throw new BusinessRuleException("No hay ejemplares disponibles de «" + book.getTitle() + "»");
        }
        if (loans.existsByMemberIdAndReturnDateIsNullAndDueDateBefore(member.getId(), today)) {
            throw new BusinessRuleException("El usuario tiene préstamos vencidos pendientes de devolver");
        }
        if (loans.countByMemberIdAndReturnDateIsNull(member.getId()) >= rules.maxActive()) {
            throw new BusinessRuleException(
                    "El usuario alcanzó el máximo de " + rules.maxActive() + " préstamos activos");
        }

        book.borrowCopy();
        Loan loan = loans.save(new Loan(book, member, today, today.plusDays(rules.days())));
        log.info("Préstamo id={} libro={} usuario={} vence={}", loan.getId(), book.getId(), member.getId(), loan.getDueDate());
        return LoanResponse.from(loan, today, rules.renewalWindowDays());
    }

    /**
     * Registra la devolución con la fecha de hoy y repone el ejemplar.
     *
     * <p>Se carga con {@code join fetch} porque la respuesta incluye título y nombre de usuario.
     *
     * @throws NotFoundException     si el préstamo no existe
     * @throws BusinessRuleException si ya había sido devuelto
     */
    public LoanResponse giveBack(Long loanId) {
        Loan loan = loans.findByIdWithDetails(loanId)
                .orElseThrow(() -> new NotFoundException("Préstamo no encontrado: " + loanId));
        LocalDate today = today();
        loan.markReturned(today); // valida que siga activo y repone el ejemplar
        log.info("Devolución préstamo id={} (vencía {})", loanId, loan.getDueDate());
        return LoanResponse.from(loan, today, rules.renewalWindowDays());
    }

    private LocalDate today() {
        return LocalDate.now(clock);
    }
}
