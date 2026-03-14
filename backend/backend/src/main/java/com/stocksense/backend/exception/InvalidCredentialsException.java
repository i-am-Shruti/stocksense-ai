package com.stocksense.backend.exception;

public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException(String message) {
        super(message);
    }
}
// Use when: wrong email or password
// HTTP Status: 401 Unauthorized