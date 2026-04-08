package com.stocksense.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateProfileRequestDTO {
    @NotBlank(message = "Name is required")
    private String name;
    
    private String currentPassword;
    
    private String newPassword;
}