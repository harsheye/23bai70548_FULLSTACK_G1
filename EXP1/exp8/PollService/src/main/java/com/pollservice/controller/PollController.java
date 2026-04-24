package com.livepoll.controller;

import com.livepoll.entity.Poll;
import com.livepoll.repository.PollRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/polls")
public class PollController {

    private final PollRepository repo;

    public PollController(PollRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<Poll> getAll() {
        return repo.findAll();
    }

    @PostMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public Poll create(@RequestBody Poll poll) {
        return repo.save(poll);
    }
}