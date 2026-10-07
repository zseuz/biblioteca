package com.biblioteca.repository;

import com.biblioteca.domain.Loan;
import com.biblioteca.dto.LoanQuery;
import com.biblioteca.dto.PageResponse;
import java.time.LocalDate;

/** Fragmento de repositorio para la búsqueda paginada del historial (implementado con JPQL). */
public interface LoanSearchRepository {

    /**
     * Busca préstamos aplicando filtro de estado, texto, orden y paginación en la base de datos.
     *
     * @param today fecha de referencia para distinguir activos de vencidos
     */
    PageResponse<Loan> search(LoanQuery query, LocalDate today);
}
