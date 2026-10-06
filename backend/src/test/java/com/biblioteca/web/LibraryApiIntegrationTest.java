package com.biblioteca.web;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Pruebas de integración de extremo a extremo (HTTP → servicio → JPA → H2 en memoria).
 *
 * <p>Cubren lo que los tests unitarios con mocks no pueden detectar: mapeo de entidades,
 * consultas JPQL, carga perezosa fuera de la transacción y el contrato JSON de la API.
 */
@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class LibraryApiIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void fullLoanLifecycleLendReturnAndStats() throws Exception {
        long bookId = createBook("Dune", "Frank Herbert", "Ciencia ficción", 1);
        long memberId = createMember("Ana", "ana@example.com");

        long loanId = idOf(lend(bookId, memberId).andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("ACTIVE"))));

        // Sin ejemplares: la regla de negocio responde 409 con un mensaje legible.
        long otherMember = createMember("Luis", "luis@example.com");
        lend(bookId, otherMember).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("ejemplares")));

        // La devolución serializa libro y usuario fuera de la transacción (carga perezosa).
        mvc.perform(post("/api/loans/{id}/return", loanId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("RETURNED")))
                .andExpect(jsonPath("$.bookTitle", is("Dune")))
                .andExpect(jsonPath("$.memberName", is("Ana")));

        mvc.perform(post("/api/loans/{id}/return", loanId)).andExpect(status().isConflict());

        mvc.perform(get("/api/books/{id}", bookId))
                .andExpect(jsonPath("$.availableCopies", is(1)));

        mvc.perform(get("/api/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalBooks", is(1)))
                .andExpect(jsonPath("$.activeLoans", is(0)))
                .andExpect(jsonPath("$.topBooks", hasSize(1)))
                .andExpect(jsonPath("$.topBooks[0].label", is("Dune")))
                .andExpect(jsonPath("$.topBooks[0].count", is(1)))
                .andExpect(jsonPath("$.loansByGenre[0].label", is("Ciencia ficción")));
    }

    @Test
    void invalidPayloadReturns400WithFieldErrors() throws Exception {
        mvc.perform(post("/api/books").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\",\"author\":\"x\",\"genre\":\"y\",\"totalCopies\":0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.title").exists())
                .andExpect(jsonPath("$.fields.totalCopies").exists());
    }

    @Test
    void malformedJsonReturns400() throws Exception {
        mvc.perform(post("/api/books").contentType(MediaType.APPLICATION_JSON).content("{no es json"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void duplicateEmailReturns409() throws Exception {
        createMember("Ana", "ana@example.com");

        mvc.perform(post("/api/members").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Otra Ana\",\"email\":\"ANA@example.com\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void unknownResourceReturns404() throws Exception {
        mvc.perform(get("/api/books/{id}", 999)).andExpect(status().isNotFound());
        mvc.perform(post("/api/loans/{id}/return", 999)).andExpect(status().isNotFound());
    }

    @Test
    void cannotDeleteBookWithLoanHistory() throws Exception {
        long bookId = createBook("Dune", "Frank Herbert", "Ciencia ficción", 2);
        long memberId = createMember("Ana", "ana@example.com");
        lend(bookId, memberId).andExpect(status().isCreated());

        mvc.perform(delete("/api/books/{id}", bookId)).andExpect(status().isConflict());
    }

    @Test
    void searchMatchesTitleAuthorOrGenreIgnoringCase() throws Exception {
        createBook("Dune", "Frank Herbert", "Ciencia ficción", 1);
        createBook("Clean Code", "Robert C. Martin", "Tecnología", 1);

        mvc.perform(get("/api/books").param("q", "herbert"))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title", is("Dune")));
        mvc.perform(get("/api/books").param("q", "")).andExpect(jsonPath("$", hasSize(2)));
    }

    // ---- helpers -----------------------------------------------------------------------

    private long createBook(String title, String author, String genre, int copies) throws Exception {
        String body = "{\"title\":\"%s\",\"author\":\"%s\",\"genre\":\"%s\",\"totalCopies\":%d}"
                .formatted(title, author, genre, copies);
        return idOf(mvc.perform(post("/api/books").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()));
    }

    private long createMember(String name, String email) throws Exception {
        String body = "{\"name\":\"%s\",\"email\":\"%s\"}".formatted(name, email);
        return idOf(mvc.perform(post("/api/members").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()));
    }

    private ResultActions lend(long bookId, long memberId) throws Exception {
        return mvc.perform(post("/api/loans").contentType(MediaType.APPLICATION_JSON)
                .content("{\"bookId\":%d,\"memberId\":%d}".formatted(bookId, memberId)));
    }

    private long idOf(ResultActions result) throws Exception {
        String json = result.andReturn().getResponse().getContentAsString();
        return com.jayway.jsonpath.JsonPath.<Number>read(json, "$.id").longValue();
    }
}
