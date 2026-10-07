package com.biblioteca.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Datos de entrada para registrar o actualizar un usuario.
 *
 * <p>El límite de {@value #NAME_MAX} caracteres del nombre se valida también en el frontend
 * (atributo {@code maxlength} y validador de Angular); aquí es la garantía definitiva, porque
 * la API puede recibir peticiones que no vengan de la interfaz.
 *
 * <p>Los nombres con números o de uno o dos caracteres <b>no</b> se rechazan: pueden ser
 * legítimos y la interfaz ya pide al usuario que los confirme antes de enviarlos.
 *
 * <p>Los textos se recortan (sin espacios al inicio ni al final) antes de validarse.
 *
 * @param name  nombre completo (obligatorio, máx. {@value #NAME_MAX} caracteres)
 * @param email correo con formato válido, de 6 a 150 caracteres; se normaliza a minúsculas
 *              antes de guardarse
 */
public record MemberRequest(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = MemberRequest.NAME_MAX, message = "El nombre no puede superar los {max} caracteres")
        String name,
        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "El correo no tiene un formato válido")
        @Size(min = 6, max = 150, message = "El correo debe tener entre {min} y {max} caracteres")
        String email) {

    /** Longitud máxima del nombre; debe coincidir con {@code NAME_MAX} del frontend. */
    public static final int NAME_MAX = 100;

    /** Recorta los textos antes de que se validen. */
    public MemberRequest {
        name = name == null ? null : name.trim();
        email = email == null ? null : email.trim();
    }
}
