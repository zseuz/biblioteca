package com.biblioteca.dto;

import java.util.List;

public record StatsResponse(long totalBooks, long totalMembers, long activeLoans, long overdueLoans,
                            List<Entry> topBooks, List<Entry> loansByGenre, List<Entry> topMembers) {

    public record Entry(String label, long count) {
    }
}
