package com.stocksense.backend.exception;

import com.stocksense.backend.dto.ErrorResponseDTO;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
// @RestControllerAdvice = watches ALL controllers
// catches exceptions thrown anywhere
// converts them to proper JSON responses
@Slf4j
public class GlobalExceptionHandler {

    // ─────────────────────────────────────────
    // Handle Email Already Exists → 409
    // ─────────────────────────────────────────
    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<ErrorResponseDTO> handleEmailExists(
            EmailAlreadyExistsException ex,
            HttpServletRequest request) {

        log.error("Email already exists: {}", ex.getMessage());

        ErrorResponseDTO error = new ErrorResponseDTO(
                409,
                "Conflict",
                ex.getMessage(),
                request.getRequestURI(),
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    // ─────────────────────────────────────────
    // Handle Invalid Credentials → 401
    // ─────────────────────────────────────────
    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ErrorResponseDTO> handleInvalidCredentials(
            InvalidCredentialsException ex,
            HttpServletRequest request) {

        log.error("Invalid credentials: {}", ex.getMessage());

        ErrorResponseDTO error = new ErrorResponseDTO(
                401,
                "Unauthorized",
                ex.getMessage(),
                request.getRequestURI(),
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    // ─────────────────────────────────────────
    // Handle Resource Not Found → 404
    // ─────────────────────────────────────────
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponseDTO> handleNotFound(
            ResourceNotFoundException ex,
            HttpServletRequest request) {

        log.error("Resource not found: {}", ex.getMessage());

        ErrorResponseDTO error = new ErrorResponseDTO(
                404,
                "Not Found",
                ex.getMessage(),
                request.getRequestURI(),
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    // ─────────────────────────────────────────
    // Handle Validation Errors → 400
    // (@NotBlank, @Email, @Size failures)
    // ─────────────────────────────────────────
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {

        // collect ALL validation errors at once
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(
                    fieldError.getField(),      // which field failed
                    fieldError.getDefaultMessage() // why it failed
            );
        }

        Map<String, Object> response = new HashMap<>();
        response.put("status", 400);
        response.put("error", "Validation Failed");
        response.put("errors", fieldErrors);
        response.put("path", request.getRequestURI());
        response.put("timestamp", LocalDateTime.now());

        log.error("Validation failed: {}", fieldErrors);
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponseDTO> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException ex,
            HttpServletRequest request) {

        log.error("Method not supported: {}", ex.getMessage());

        ErrorResponseDTO error = new ErrorResponseDTO(
                405,
                "Method Not Allowed",
                ex.getMessage(),
                request.getRequestURI(),
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(error);
    }

    // ─────────────────────────────────────────
    // Handle ALL other exceptions → 500
    // ─────────────────────────────────────────
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponseDTO> handleGeneral(
            Exception ex,
            HttpServletRequest request) {

        log.error("Unexpected error: {}", ex.getMessage());

        ErrorResponseDTO error = new ErrorResponseDTO(
                500,
                "Internal Server Error",
                "Something went wrong. Please try again!",
                request.getRequestURI(),
                LocalDateTime.now()
        );
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(error);
    }
}