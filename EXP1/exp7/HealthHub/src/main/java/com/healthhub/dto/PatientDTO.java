package com.healthhub.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor

public class PatientDTO {
    private Long id;

    @NotBlank(message = "Name cannot be empty")
    private String name;

    @Email(message = "Invalid Email")
    private String email;

    @Min(value = 1, message = "Age must be valid")
    private int age;

    @NotBlank(message = "Disease field required")
    private String disease;
}
