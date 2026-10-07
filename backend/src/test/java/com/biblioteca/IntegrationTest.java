package com.biblioteca;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Base de todas las pruebas que arrancan Spring (integración, concurrencia y arranque).
 *
 * <p><b>Por qué existe.</b> Antes cada prueba de integración reiniciaba Spring completo al
 * terminar ({@code @DirtiesContext}) para empezar con la base vacía: unos 40 reinicios de más de
 * un segundo cada uno. Ahora todas las clases comparten la misma configuración, así que Spring
 * arranca <b>una sola vez</b> (lo guarda en su caché de contextos) y, para que cada prueba siga
 * empezando desde cero, antes de cada una se vacían las tablas con {@link #cleanDatabase()}.
 *
 * <p>Usa la base H2 en memoria de {@code src/test/resources/application.properties}; el perfil
 * {@code test} desactiva la carga de datos de ejemplo. Nunca toca la base real.
 */
@SpringBootTest
@AutoConfigureMockMvc
public abstract class IntegrationTest {

    @Autowired
    private JdbcTemplate database;

    /**
     * Vacía las tablas antes de cada prueba. El orden importa por las claves foráneas: primero
     * las renovaciones (apuntan a préstamos), luego los préstamos (apuntan a libros y usuarios)
     * y por último libros y usuarios.
     */
    @BeforeEach
    void cleanDatabase() {
        database.execute("delete from loan_renewal");
        database.execute("delete from loan");
        database.execute("delete from book");
        database.execute("delete from member");
    }
}
