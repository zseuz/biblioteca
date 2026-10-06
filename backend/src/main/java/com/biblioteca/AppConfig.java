package com.biblioteca;

import java.time.Clock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Configuración transversal: reloj inyectable y política CORS para el frontend. */
@Configuration
public class AppConfig implements WebMvcConfigurer {

    @Value("${app.cors.allowed-origins}")
    private String[] allowedOrigins;

    /**
     * Reloj único de la aplicación. Inyectarlo (en lugar de llamar a {@code LocalDate.now()})
     * permite fijar la fecha en los tests y evita dependencias ocultas del tiempo real.
     */
    @Bean
    Clock clock() {
        return Clock.systemDefaultZone();
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .maxAge(3600); // el navegador cachea el preflight una hora
    }
}
