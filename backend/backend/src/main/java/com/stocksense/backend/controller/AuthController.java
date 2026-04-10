package com.stocksense.backend.controller;

import com.stocksense.backend.dto.AuthResponseDTO;
import com.stocksense.backend.dto.ForgotPasswordRequestDTO;
import com.stocksense.backend.dto.LoginRequestDTO;
import com.stocksense.backend.dto.RegisterRequestDTO;
import com.stocksense.backend.dto.ResetPasswordRequestDTO;
import com.stocksense.backend.dto.UpdateProfileRequestDTO;
import com.stocksense.backend.service.AuthService;
import com.stocksense.backend.utils.JwtUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    private final JwtUtils jwtUtils;

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        log.info("=== HEALTH CHECK HIT ===");
        return ResponseEntity.ok("Backend is running! StockSense AI OTP Service Active.");
    }

    // POST /api/auth/register
    @PostMapping("/register")
    // handles: POST http://localhost:8085/api/auth/register
    public ResponseEntity<AuthResponseDTO> register(
        @RequestBody // @RequestBody = read JSON from request body → convert to DTO
        @Valid       // trigger validation (@NotBlank, @Email etc)
        RegisterRequestDTO request){
        log.info("Register request received for: {}", request.getEmail());
        
        if (request.getOtp() != null && request.getVerified() != null && request.getVerified()) {
            AuthResponseDTO response = authService.verifyAndRegister(
                    request.getEmail(),
                    request.getOtp(),
                    request.getName(),
                    request.getPassword()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        }
        
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
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@RequestBody ForgotPasswordRequestDTO request){
        try {
            log.info("Forgot password request for: {}", request.getEmail());
            String message = authService.sendForgotPasswordOtp(request.getEmail());
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            log.error("Forgot password error: {}", e.getMessage());
            return ResponseEntity.ok("If the email is registered, an OTP has been sent");
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody ResetPasswordRequestDTO request){
        log.info("Reset password request for: {}", request.getEmail());
        String message = authService.resetPassword(
                request.getEmail(),
                request.getOtp(),
                request.getNewPassword()
        );
        return ResponseEntity.ok(message);
    }

    @PostMapping("/send-otp")
    public ResponseEntity<String> sendRegistrationOtp(@RequestBody ForgotPasswordRequestDTO request){
        log.info("Send OTP for registration: {}", request.getEmail());
        String message = authService.sendRegistrationOtp(request.getEmail());
        return ResponseEntity.ok(message);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<String> verifyOtp(@RequestBody ResetPasswordRequestDTO request){
        log.info("Verify OTP for: {}", request.getEmail());
        try {
            authService.validateOtp(request.getEmail(), request.getOtp());
            return ResponseEntity.ok("OTP verified");
        } catch (com.stocksense.backend.service.OtpService.OtpExpiredException e) {
            return ResponseEntity.status(HttpStatus.GONE).body(e.getMessage());
        } catch (com.stocksense.backend.service.OtpService.OtpInvalidException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<AuthResponseDTO> updateProfile(
            @RequestBody UpdateProfileRequestDTO request,
            @RequestHeader("Authorization") String authHeader){
        String token = authHeader.replace("Bearer ", "");
        String email = jwtUtils.getEmailFromToken(token);
        
        AuthResponseDTO response = authService.updateProfile(
                email,
                request.getName(),
                request.getCurrentPassword(),
                request.getNewPassword()
        );
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/profile")
    public ResponseEntity<String> deleteAccount(
            @RequestHeader("Authorization") String authHeader){
        String token = authHeader.replace("Bearer ", "");
        String email = jwtUtils.getEmailFromToken(token);
        
        authService.deleteAccount(email);
        return ResponseEntity.ok("Account deleted successfully");
    }
}
