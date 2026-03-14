package com.stocksense.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor

public class AuthResponseDTO {
    private  String token;
    private String name;
    private String email;
    private String role;
    private String message;
}
