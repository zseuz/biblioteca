package com.biblioteca.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Datos de entrada para registrar o actualizar un usuario.
 *
 * @param name  nombre completo (obligatorio, máx. 150 caracteres)
 * @param email correo con formato válido; se normaliza a minúsculas antes de guardarse
 */
public record MemberRequest(
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Email @Size(max = 150) String email) {
}
