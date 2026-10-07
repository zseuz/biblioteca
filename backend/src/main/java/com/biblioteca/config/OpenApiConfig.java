package com.biblioteca.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Metadatos de la documentación OpenAPI.
 *
 * <ul>
 *   <li>Interfaz interactiva: {@code http://localhost:8080/swagger-ui.html}</li>
 *   <li>Especificación JSON: {@code http://localhost:8080/v3/api-docs}</li>
 * </ul>
 *
 * <p>Los endpoints, parámetros y modelos se generan a partir del propio código (controladores,
 * records de DTO y anotaciones de validación), así que la documentación no se desincroniza.
 */
@Configuration
public class OpenApiConfig {

    /**
     * Datos generales que muestra Swagger UI (título, descripción y versión de la API). Los
     * endpoints en sí se documentan solos a partir de los controladores y sus anotaciones @Operation.
     */
    @Bean
    OpenAPI libraryOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("API del Sistema de Biblioteca")
                        .version("1.0.0")
                        .description("""
                                CRUD de libros y usuarios, gestión de préstamos con reglas de negocio
                                y estadísticas.

                                **Errores:** todas las respuestas de error usan el mismo formato
                                `{timestamp, status, message, path, fields?}`:
                                `400` datos inválidos (con `fields` por campo), `404` no existe,
                                `409` regla de negocio o conflicto de concurrencia.
                                """)
                        .license(new License().name("Uso educativo")))
                .servers(List.of(new Server().url("http://localhost:8080").description("Local")))
                .tags(List.of(
                        new Tag().name("Libros").description("Catálogo y control de ejemplares"),
                        new Tag().name("Usuarios").description("Lectores de la biblioteca"),
                        new Tag().name("Préstamos").description("Préstamos, devoluciones e historial"),
                        new Tag().name("Estadísticas").description("Indicadores del panel")));
    }
}
