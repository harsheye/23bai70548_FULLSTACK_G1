package com.livepoll.dto;

import lombok.Data;

@Data
public class PollDTO {
    private Long id;
    private String question;
    private int votes;
}