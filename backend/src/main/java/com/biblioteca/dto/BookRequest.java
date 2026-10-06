package com.biblioteca.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BookRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 150) String author,
        @NotBlank @Size(max = 80) String genre,
        @Min(1) int totalCopies) {
}
