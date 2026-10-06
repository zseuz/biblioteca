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

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    /** Requerido por JPA; no usar directamente. */
    protected Member() {
    }

    public Member(String name, String email) {
        this.name = name.trim();
        this.email = normalize(email);
    }

    public void update(String name, String email) {
        this.name = name.trim();
        this.email = normalize(email);
    }

    /** Forma canónica del correo, usada también para las búsquedas de duplicados. */
    public static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }

    @Override
    public boolean equals(Object o) {
        return this == o || (o instanceof Member other && id != null && Objects.equals(id, other.getId()));
    }

    @Override
    public int hashCode() {
        return Member.class.hashCode();
    }

    @Override
    public String toString() {
        return "Member[id=" + id + ", name=" + name + "]";
    }
}
