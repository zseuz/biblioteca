package com.biblioteca.web;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.biblioteca.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Pruebas de integración de extremo a extremo (HTTP → servicio → JPA → H2 en memoria).
 *
 * <p>Cubren lo que los tests unitarios con mocks no pueden detectar: mapeo de entidades,
 * consultas JPQL, carga perezosa fuera de la transacción y el contrato JSON de la API.
 */
class LibraryApiIntegrationTest extends IntegrationTest {

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
                .andExpect(jsonPath("$.returnedLoans", is(1)))
                // Serie continua de 6 meses terminando en el actual, con el préstamo de hoy.
                .andExpect(jsonPath("$.loansByMonth", hasSize(6)))
                .andExpect(jsonPath("$.loansByMonth[5].label", is(java.time.YearMonth.now().toString())))
                .andExpect(jsonPath("$.loansByMonth[5].count", is(1)))
                .andExpect(jsonPath("$.loansByMonth[0].count", is(0)))
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
    void memberNameLongerThan100CharsIsRejected() throws Exception {
        String longName = "A".repeat(101);

        mvc.perform(post("/api/members").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"%s\",\"email\":\"largo@example.com\"}".formatted(longName)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.name", is("El nombre no puede superar los 100 caracteres")));

        // Exactamente 100 caracteres sí es válido.
        createMember("B".repeat(100), "justo@example.com");
    }

    @Test
    void memberNameWithDigitsOrSingleCharIsAccepted() throws Exception {
        // No se bloquean: la interfaz pide confirmación, pero pueden ser nombres legítimos.
        createMember("Juan Pablo 2", "jp2@example.com");
        createMember("X", "x@example.com");
        createMember("Al", "al@example.com");
    }

    @Test
    void bookFieldsHaveMinimumAndMaximumLengthsWithClearMessages() throws Exception {
        String base = "{\"title\":\"%s\",\"author\":\"%s\",\"genre\":\"%s\",\"totalCopies\":%d}";

        postBook(base.formatted("x".repeat(900), "Frank Herbert", "Novela", 1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.title", is("El título debe tener entre 2 y 200 caracteres")));
        postBook(base.formatted("V", "Frank Herbert", "Novela", 1))
                .andExpect(jsonPath("$.fields.title", is("El título debe tener entre 2 y 200 caracteres")));
        postBook(base.formatted("Dune", "Al", "Novela", 1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.author", is("El autor debe tener entre 3 y 150 caracteres")));
        postBook(base.formatted("Dune", "Frank Herbert", "XY", 1))
                .andExpect(jsonPath("$.fields.genre", is("El género debe tener entre 3 y 80 caracteres")));
        postBook(base.formatted("Dune", "Frank Herbert", "Novela", 1001))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.totalCopies", is("No puede haber más de 1000 ejemplares")));
        postBook(base.formatted("Dune", "Frank Herbert", "Novela", 0))
                .andExpect(jsonPath("$.fields.totalCopies", is("Debe haber al menos 1 ejemplar")));

        // Los espacios no cuentan: «   a   » es un título de 1 carácter.
        postBook(base.formatted("   a   ", "Frank Herbert", "Novela", 1))
                .andExpect(jsonPath("$.fields.title", is("El título debe tener entre 2 y 200 caracteres")));

        // En los límites exactos sí se acepta.
        createBook("It", "Ana", "Cuento", 1000);
        createBook("t".repeat(200), "a".repeat(150), "g".repeat(80), 1);
    }

    @Test
    void memberEmailMustHaveBetweenSixAndOneHundredFiftyCharacters() throws Exception {
        mvc.perform(post("/api/members").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Ana\",\"email\":\"a@b.c\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.email").exists());
        createMember("Ana", "a@b.co"); // 6 caracteres: válido
    }

    private ResultActions postBook(String json) throws Exception {
        return mvc.perform(post("/api/books").contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void sameTitleAuthorAndGenreCannotBeRegisteredTwice() throws Exception {
        long id = createBook("Dune", "Frank Herbert", "Ciencia ficción", 2);

        // Mayúsculas y espacios distintos siguen siendo el mismo libro.
        mvc.perform(post("/api/books").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"  dune \",\"author\":\"FRANK   herbert\",\"genre\":\"ciencia ficción\",\"totalCopies\":3}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("Añade ejemplares")));

        mvc.perform(get("/api/books")).andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/books/{id}", id)).andExpect(jsonPath("$.totalCopies", is(2)));
    }

    @Test
    void duplicateCheckSeparatesSameBookFromDifferentGenre() throws Exception {
        long novela = createBook("Rayuela", "Julio Cortázar", "Novela", 1);
        long ficcion = createBook("Rayuela", "Julio Cortázar", "Ficción", 1);
        createBook("Rayuela", "Otro Autor", "Novela", 1); // otro autor: no cuenta

        mvc.perform(get("/api/books/duplicates")
                        .param("title", "rayuela").param("author", "julio cortázar").param("genre", "NOVELA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sameBook.id", is((int) novela)))
                .andExpect(jsonPath("$.differentGenre", hasSize(1)))
                .andExpect(jsonPath("$.differentGenre[0].id", is((int) ficcion)));

        mvc.perform(get("/api/books/duplicates")
                        .param("title", "Rayuela").param("author", "Julio Cortázar").param("genre", "Ensayo"))
                .andExpect(jsonPath("$.sameBook").doesNotExist())
                .andExpect(jsonPath("$.differentGenre", hasSize(2)));
    }

    @Test
    void sameTitleAndAuthorWithDifferentGenreIsAllowed() throws Exception {
        createBook("Rayuela", "Julio Cortázar", "Novela", 1);
        createBook("Rayuela", "Julio Cortázar", "Ficción", 1); // createBook exige 201
    }

    @Test
    void addingCopiesIncreasesTotalAndAvailable() throws Exception {
        long id = createBook("Dune", "Frank Herbert", "Ciencia ficción", 1);
        long memberId = createMember("Ana", "ana@example.com");
        lend(id, memberId).andExpect(status().isCreated()); // 1 prestado, 0 disponibles

        mvc.perform(post("/api/books/{id}/copies", id).contentType(MediaType.APPLICATION_JSON).content("{\"quantity\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCopies", is(4)))
                .andExpect(jsonPath("$.availableCopies", is(3)));

        mvc.perform(post("/api/books/{id}/copies", id).contentType(MediaType.APPLICATION_JSON).content("{\"quantity\":0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.quantity").exists());
        mvc.perform(post("/api/books/{id}/copies", 999_999).contentType(MediaType.APPLICATION_JSON).content("{\"quantity\":1}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void editingABookIntoAnExistingOneIsRejected() throws Exception {
        createBook("Dune", "Frank Herbert", "Ciencia ficción", 1);
        long other = createBook("Dune Messiah", "Frank Herbert", "Ciencia ficción", 1);

        mvc.perform(put("/api/books/{id}", other).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Dune\",\"author\":\"Frank Herbert\",\"genre\":\"Ciencia ficción\",\"totalCopies\":1}"))
                .andExpect(status().isConflict());
        // Editarse a sí mismo con los mismos datos sí está permitido.
        mvc.perform(put("/api/books/{id}", other).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Dune Messiah\",\"author\":\"Frank Herbert\",\"genre\":\"Ciencia ficción\",\"totalCopies\":2}"))
                .andExpect(status().isOk());
    }

    @Test
    void openApiDocumentationIsPublished() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title", is("API del Sistema de Biblioteca")))
                .andExpect(jsonPath("$.paths['/api/loans'].post.summary", is("Prestar un libro")))
                .andExpect(jsonPath("$.components.schemas.ApiError").exists());
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
        mvc.perform(get("/api/books/{id}", 999_999)).andExpect(status().isNotFound());
        mvc.perform(post("/api/loans/{id}/return", 999_999)).andExpect(status().isNotFound());
    }

    @Test
    void cannotDeleteBookWithLoanHistory() throws Exception {
        long bookId = createBook("Dune", "Frank Herbert", "Ciencia ficción", 2);
        long memberId = createMember("Ana", "ana@example.com");
        lend(bookId, memberId).andExpect(status().isCreated());

        mvc.perform(delete("/api/books/{id}", bookId)).andExpect(status().isConflict());
    }

    @Test
    void membersListIncludesLoanCountersSoTheUiKnowsWhoCanBeDeleted() throws Exception {
        long bookId = createBook("Dune", "Frank Herbert", "Ciencia ficción", 3);
        long ana = createMember("Ana", "ana@example.com");
        createMember("Bruno", "bruno@example.com");
        lend(bookId, ana).andExpect(status().isCreated());
        long returnedLoan = idOf(lend(bookId, ana).andExpect(status().isCreated()));
        mvc.perform(post("/api/loans/{id}/return", returnedLoan)).andExpect(status().isOk());

        mvc.perform(get("/api/members"))
                .andExpect(jsonPath("$[0].name", is("Ana")))
                .andExpect(jsonPath("$[0].activeLoans", is(1)))
                .andExpect(jsonPath("$[0].totalLoans", is(2)))
                .andExpect(jsonPath("$[1].name", is("Bruno")))
                .andExpect(jsonPath("$[1].activeLoans", is(0)))
                .andExpect(jsonPath("$[1].totalLoans", is(0)));

        // La regla se mantiene en el servidor aunque la interfaz ya lo anticipe.
        mvc.perform(delete("/api/members/{id}", ana)).andExpect(status().isConflict());
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

    @Test
    void searchIgnoresAccents() throws Exception {
        createBook("Cien años de soledad", "Gabriel García Márquez", "Realismo mágico", 1);
        createBook("Dune", "Frank Herbert", "Ciencia ficción", 1);

        mvc.perform(get("/api/books").param("q", "garcia")).andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/books").param("q", "GARCÍA")).andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/books").param("q", "anos")).andExpect(jsonPath("$", hasSize(1)));   // ñ ≈ n
        mvc.perform(get("/api/books").param("q", "magico")).andExpect(jsonPath("$", hasSize(1))); // en el género
        mvc.perform(get("/api/books").param("q", "ficcion")).andExpect(jsonPath("$[0].title", is("Dune")));
        mvc.perform(get("/api/books").param("q", "50%")).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void missingRequiredParametersAreClientErrorsNotServerErrors() throws Exception {
        mvc.perform(get("/api/loans/active").param("memberId", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", is("Falta el parámetro obligatorio 'bookId'")));
        mvc.perform(get("/api/loans/active")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/books/duplicates").param("title", "Dune"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", is("Falta el parámetro obligatorio 'author'")));
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
