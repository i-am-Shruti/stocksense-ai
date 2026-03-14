package com.stocksense.backend.exception;

public class ResourceNotFoundException extends RuntimeException{

    public ResourceNotFoundException(String message){
        super(message);
    }
}
// Use when: resource not found in DB
// Example: stock "AAPL" doesn't exist
// HTTP Status: 404 Not Found