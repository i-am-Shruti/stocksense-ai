package com.stocksense.backend.controller;

import com.stocksense.backend.dto.AuthResponseDTO;
import com.stocksense.backend.dto.LoginRequestDTO;
import com.stocksense.backend.dto.RegisterRequestDTO;
import com.stocksense.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.validator.internal.util.logging.Log;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
// @Controller + @ResponseBody combined
// @Controller    = this class handles HTTP requests
// @ResponseBody  = return value → automatically converted to JSON

@RequestMapping("/api/auth")
// ALL endpoints in this class start with /api/auth  like (/api/auth/register)
@RequiredArgsConstructor
@Slf4j
public class AuthController {
    private final AuthService authService;

    // POST /api/auth/register
    @PostMapping("/register")
    // handles: POST http://localhost:8085/api/auth/register
    public ResponseEntity<AuthResponseDTO> register(
        @RequestBody // @RequestBody = read JSON from request body → convert to DTO
        @Valid       // trigger validation (@NotBlank, @Email etc)
        RegisterRequestDTO request){
        log.info("Register request received for: {}", request.getEmail());
        AuthResponseDTO response  = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
        // HttpStatus.CREATED = HTTP 201
        // means "resource was successfully CREATED"
    }
    // POST /api/auth/login

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> login(@RequestBody @Valid LoginRequestDTO request){
        log.info("Login request received for: {}", request.getEmail());
        AuthResponseDTO response  = authService.login(request);
        return ResponseEntity.ok(response);
        // ResponseEntity.ok() = HTTP 200
        // means "request was successful"
    }
}
