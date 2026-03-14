package com.stocksense.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ErrorResponseDTO {

    private int status;           // HTTP status code (400, 404, 500)
    private String error;         // error type ("Bad Request")
    private String message;       // human readable message
    private String path;          // which URL caused error
    private LocalDateTime timestamp; // when did error occur
}