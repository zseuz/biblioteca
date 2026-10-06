package com.biblioteca;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Prueba de humo: el contexto de Spring arranca con la configuración real (beans,
 * mapeo JPA, propiedades validadas). Detecta errores de cableado antes que cualquier otro test.
 */
@SpringBootTest
class BibliotecaApplicationTests {

    @Test
    void contextLoads() {
        // Si el contexto no puede construirse, el test falla antes de llegar aquí.
    }
}
