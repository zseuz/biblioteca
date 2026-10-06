package com.biblioteca.domain;

import jakarta.persistence.*;

@Entity
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String author;

    @Column(nullable = false)
    private String genre;

    private int totalCopies;

    private int availableCopies;

    protected Book() {
    }

    public Book(String title, String author, String genre, int totalCopies) {
        this.title = title;
        this.author = author;
        this.genre = genre;
        this.totalCopies = totalCopies;
        this.availableCopies = totalCopies;
    }

    public boolean isAvailable() {
        return availableCopies > 0;
    }

    public void borrowCopy() {
        if (!isAvailable()) {
            throw new IllegalStateException("No hay ejemplares disponibles");
        }
        availableCopies--;
    }

    public void returnCopy() {
        if (availableCopies < totalCopies) {
            availableCopies++;
        }
    }

    /** Actualiza los datos y ajusta los ejemplares disponibles según el nuevo total. */
    public void update(String title, String author, String genre, int totalCopies) {
        int onLoan = this.totalCopies - this.availableCopies;
        if (totalCopies < onLoan) {
            throw new IllegalArgumentException(
                    "El total de ejemplares no puede ser menor que los prestados (" + onLoan + ")");
        }
        this.title = title;
        this.author = author;
        this.genre = genre;
        this.totalCopies = totalCopies;
        this.availableCopies = totalCopies - onLoan;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getAuthor() { return author; }
    public String getGenre() { return genre; }
    public int getTotalCopies() { return totalCopies; }
    public int getAvailableCopies() { return availableCopies; }
}
