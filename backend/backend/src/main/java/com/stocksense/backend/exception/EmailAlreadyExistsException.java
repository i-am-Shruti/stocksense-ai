package com.stocksense.backend.exception;

public class EmailAlreadyExistsException extends RuntimeException {

    public EmailAlreadyExistsException(String message) {
        super(message);
    }
}
// Use when: duplicate email during registration
// HTTP Status: 409 Conflict