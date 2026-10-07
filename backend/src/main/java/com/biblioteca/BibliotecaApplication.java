package com.biblioteca;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Punto de entrada de la API del Sistema de Biblioteca.
 *
 * <p>{@link ConfigurationPropertiesScan} registra automáticamente los records de
 * configuración tipada del proyecto (p. ej. {@code LibraryProperties}).
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class BibliotecaApplication {

    /**
     * Punto de entrada: arranca Spring Boot, que crea todos los componentes (controladores,
     * servicios, repositorios), configura la base de datos y levanta el servidor web en el puerto 8080.
     */
    public static void main(String[] args) {
        SpringApplication.run(BibliotecaApplication.class, args);
    }
}
