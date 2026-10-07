package com.biblioteca.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Locale;
import java.util.Objects;

/**
 * Usuario de la biblioteca. El correo es su identificador natural: se normaliza
 * (sin espacios y en minúsculas) antes de guardarse y tiene restricción de unicidad en BD,
 * que es la garantía final frente a registros simultáneos.
 */
@Entity
@Table(name = "member")
public class Member {

    /** Identificador del usuario, generado por la base de datos. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nombre completo (máximo 100 caracteres). */
    @Column(nullable = false, length = 100)
    private String name;

    /**
     * Correo en minúsculas y sin espacios. {@code unique = true} crea una restricción en la base:
     * aunque dos altas lleguen a la vez con el mismo correo, solo una se guarda.
     */
    @Column(nullable = false, unique = true, length = 150)
    private String email;

    /** Requerido por JPA; no usar directamente. */
    protected Member() {
    }

    /** Crea un usuario guardando el nombre sin espacios sobrantes y el correo normalizado. */
    public Member(String name, String email) {
        this.name = name.trim();
        this.email = normalize(email);
    }

    /** Cambia nombre y correo aplicando la misma normalización que al crearlo. */
    public void update(String name, String email) {
        this.name = name.trim();
        this.email = normalize(email);
    }

    /** Forma canónica del correo, usada también para las búsquedas de duplicados. */
    public static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    /** Getters de solo lectura (los cambios pasan por el constructor o por {@link #update}). */
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }

    /**
     * Dos usuarios son el mismo si tienen el mismo id de base de datos. Es seguro con los proxies
     * de Hibernate y no cambia entre transacciones.
     */
    @Override
    public boolean equals(Object o) {
        return this == o || (o instanceof Member other && id != null && Objects.equals(id, other.getId()));
    }

    /** Constante por clase: coherente con {@link #equals} aunque el id se asigne al guardar. */
    @Override
    public int hashCode() {
        return Member.class.hashCode();
    }

    /** Texto corto para los mensajes de log (no incluye el correo). */
    @Override
    public String toString() {
        return "Member[id=" + id + ", name=" + name + "]";
    }
}
