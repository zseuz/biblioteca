package com.biblioteca.dto;

import com.biblioteca.domain.Book;

public record BookResponse(Long id, String title, String author, String genre,
                           int totalCopies, int availableCopies, boolean available) {

    public static BookResponse from(Book b) {
        return new BookResponse(b.getId(), b.getTitle(), b.getAuthor(), b.getGenre(),
                b.getTotalCopies(), b.getAvailableCopies(), b.isAvailable());
    }
}
