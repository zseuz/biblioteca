package com.biblioteca.web;

import com.biblioteca.dto.LoanRequest;
import com.biblioteca.dto.LoanResponse;
import com.biblioteca.service.LoanService;
import jakarta.validation.Valid;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/loans")
public class LoanController {

    private final LoanService service;
    private final Clock clock;

    public LoanController(LoanService service, Clock clock) {
        this.service = service;
        this.clock = clock;
    }

    @GetMapping
    public List<LoanResponse> list() {
        LocalDate today = LocalDate.now(clock);
        return service.list().stream().map(l -> LoanResponse.from(l, today)).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LoanResponse lend(@Valid @RequestBody LoanRequest request) {
        return LoanResponse.from(service.lend(request), LocalDate.now(clock));
    }

    @PostMapping("/{id}/return")
    public LoanResponse giveBack(@PathVariable Long id) {
        return LoanResponse.from(service.giveBack(id), LocalDate.now(clock));
    }
}
