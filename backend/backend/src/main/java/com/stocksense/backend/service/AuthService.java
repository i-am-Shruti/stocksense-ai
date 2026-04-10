package com.stocksense.backend.service;

import com.stocksense.backend.dto.AuthResponseDTO;
import com.stocksense.backend.dto.LoginRequestDTO;
import com.stocksense.backend.dto.RegisterRequestDTO;
import com.stocksense.backend.exception.EmailAlreadyExistsException;
import com.stocksense.backend.exception.InvalidCredentialsException;
import com.stocksense.backend.model.User;
import com.stocksense.backend.repository.UserRepository;
import com.stocksense.backend.utils.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;


@Service
@RequiredArgsConstructor
@Slf4j

public class AuthService {
    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final OtpService otpService;
    private final EmailService emailService;

    @Cacheable(value = "userEmail", key = "#request.email", unless = "#result == null")
    public AuthResponseDTO register(RegisterRequestDTO request){
        log.info("Register attempt for email: {}", request.getEmail());

        if(userRepository.existsByEmail(request.getEmail())) {
            log.warn("Email already exists: {}", request.getEmail());
            throw new EmailAlreadyExistsException("Email already registered");

        }
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole("USER");
        user.setIsActive(true);

        User savedUser = userRepository.save(user);
        log.info("User registered successfully with id: {}", savedUser.getId());

        String token = jwtUtils.generateToken(savedUser.getEmail());
        return  new AuthResponseDTO(
                token,
        savedUser.getName(),
        savedUser.getEmail(),
        savedUser.getRole(),
        "Registration successfull !"
                );
    }

    public AuthResponseDTO login(LoginRequestDTO request) {
        log.info("Login attempt for email: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    log.warn("User not found: {}", request.getEmail());
                    return new RuntimeException("Invalid email or password");
                });

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        String token = jwtUtils.generateToken(user.getEmail());
        log.info("Login successful for: {}", user.getEmail());

        return new AuthResponseDTO(
                token,
                user.getName(),
                user.getEmail(),
                user.getRole(),
                "Login successful!"
        );
    }

    @Cacheable(value = "userProfile", key = "#email")
    public User getUserProfile(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found!")
                );
    }

    @Async
    public void sendForgotPasswordOtpAsync(String email) {
        try {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Email not registered"));
            
            String otp = otpService.generateOtp(email);
            emailService.sendPasswordResetEmail(email, otp);
            log.info("Forgot password OTP sent to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send OTP: {}", e.getMessage());
        }
    }

    public String sendForgotPasswordOtp(String email) {
        sendForgotPasswordOtpAsync(email);
        // Always return success to prevent email enumeration
        return "If the email is registered, an OTP has been sent";
    }

    @CacheEvict(value = "userProfile", key = "#email")
    public String resetPassword(String email, String otp, String newPassword) {
        otpService.validateOtp(email, otp);
        
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("Password reset for: {}", email);
        return "Password reset successful";
    }

    @Async
    public void sendRegistrationOtpAsync(String email) {
        log.info("=== SEND OTP ASYNC START for: {} ===", email);
        try {
            String otp = otpService.generateOtp(email);
            log.info("=== OTP GENERATED: {} ===", otp);
            emailService.sendOtpEmail(email, otp);
            log.info("=== SEND OTP ASYNC END for: {} ===", email);
        } catch (Exception e) {
            log.error("=== SEND OTP ASYNC FAILED for: {} ===", email, e);
        }
    }

    public String sendRegistrationOtp(String email) {
        log.info(">>> sendRegistrationOtp called for: {}", email);
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("Email already registered");
        }
        
        log.info(">>> Calling sendRegistrationOtpAsync for: {}", email);
        sendRegistrationOtpAsync(email);
        log.info(">>> Returning success message for: {}", email);
        return "OTP sent to your email";
    }

    public AuthResponseDTO verifyAndRegister(String email, String otp, String name, String password) {
        otpService.validateOtp(email, otp);
        
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("Email already registered");
        }
        
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole("USER");
        user.setIsActive(true);
        
        User savedUser = userRepository.save(user);
        log.info("User registered after OTP verification: {}", email);
        
        String token = jwtUtils.generateToken(savedUser.getEmail());
        return new AuthResponseDTO(
                token,
                savedUser.getName(),
                savedUser.getEmail(),
                savedUser.getRole(),
                "Registration successful!"
        );
    }

    @CacheEvict(value = {"userProfile", "userEmail"}, allEntries = true)
    public AuthResponseDTO updateProfile(String email, String name, String currentPassword, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (name != null && !name.isEmpty()) {
            user.setName(name);
        }
        
        if (newPassword != null && !newPassword.isEmpty()) {
            if (currentPassword == null || currentPassword.isEmpty()) {
                throw new RuntimeException("Current password required to change password");
            }
            
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, currentPassword)
            );
            
            user.setPassword(passwordEncoder.encode(newPassword));
        }
        
        User updatedUser = userRepository.save(user);
        log.info("Profile updated for: {}", email);
        
        String token = jwtUtils.generateToken(updatedUser.getEmail());
        return new AuthResponseDTO(
                token,
                updatedUser.getName(),
                updatedUser.getEmail(),
                updatedUser.getRole(),
                "Profile updated!"
        );
    }

    public void validateOtp(String email, String otp) {
        otpService.validateOtp(email, otp);
    }

    @CacheEvict(value = {"userProfile", "userEmail"}, allEntries = true)
    public void deleteAccount(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        userRepository.delete(user);
        log.info("Account deleted for: {}", email);
    }

}

