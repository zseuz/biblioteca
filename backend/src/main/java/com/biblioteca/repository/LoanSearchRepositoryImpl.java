package com.biblioteca.repository;

import com.biblioteca.domain.Loan;
import com.biblioteca.dto.LoanQuery;
import com.biblioteca.dto.LoanQuery.StatusFilter;
import com.biblioteca.dto.PageResponse;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import java.time.LocalDate;
import java.util.List;

/**
 * Implementación de {@link LoanSearchRepository} (Spring Data la detecta por el sufijo
 * {@code Impl} y la combina con {@link LoanRepository}).
 *
 * <p>Se construye la consulta JPQL según los filtros activos para que cada petición solo incluya
 * las condiciones necesarias. Es segura frente a inyección: el texto del usuario siempre va como
 * parámetro, y la expresión de orden sale de la lista blanca de {@link LoanQuery.SortField}.
 *
 * <p>Dos consultas por página: los datos (con {@code join fetch} de libro y usuario, sin N+1) y el
 * total. Se añade {@code l.id} como último criterio de orden para que la paginación sea estable
 * cuando hay valores repetidos (p. ej. varios préstamos con la misma fecha).
 */
class LoanSearchRepositoryImpl implements LoanSearchRepository {

    @PersistenceContext
    private EntityManager em;

    @Override
    public PageResponse<Loan> search(LoanQuery query, LocalDate today) {
        String where = whereClause(query);
        String order = " order by " + query.sort().jpql() + (query.ascending() ? " asc" : " desc")
                + ", l.id " + (query.ascending() ? "asc" : "desc");

        TypedQuery<Loan> data = em.createQuery(
                "select l from Loan l join fetch l.book b join fetch l.member m" + where + order, Loan.class);
        TypedQuery<Long> count = em.createQuery(
                "select count(l) from Loan l join l.book b join l.member m" + where, Long.class);

        bind(data, query, today, true);
        bind(count, query, today, false);

        List<Loan> content = data
                .setFirstResult(query.page() * query.size())
                .setMaxResults(query.size())
                .getResultList();
        return PageResponse.of(content, query.page(), query.size(), count.getSingleResult());
    }

    private static String whereClause(LoanQuery query) {
        StringBuilder where = new StringBuilder(" where 1 = 1");
        switch (query.status()) {
            case ACTIVE -> where.append(" and l.returnDate is null and l.dueDate >= :today");
            case OVERDUE -> where.append(" and l.returnDate is null and l.dueDate < :today");
            case RETURNED -> where.append(" and l.returnDate is not null");
            case ALL -> { }
        }
        if (!query.text().isEmpty()) {
            where.append(" and (").append(TextSearch.unaccented("b.title")).append(" like :text escape '\\' or ")
                    .append(TextSearch.unaccented("m.name")).append(" like :text escape '\\')");
        }
        return where.toString();
    }

    /** Solo se enlazan los parámetros que la consulta usa (JPA falla con parámetros sobrantes). */
    private static void bind(TypedQuery<?> q, LoanQuery query, LocalDate today, boolean withOrder) {
        boolean statusUsesToday = query.status() == StatusFilter.ACTIVE || query.status() == StatusFilter.OVERDUE;
        boolean orderUsesToday = withOrder && query.sort() == LoanQuery.SortField.STATUS;
        if (statusUsesToday || orderUsesToday) {
            q.setParameter("today", today);
        }
        if (!query.text().isEmpty()) {
            q.setParameter("text", TextSearch.containsPattern(query.text()));
        }
    }
}
