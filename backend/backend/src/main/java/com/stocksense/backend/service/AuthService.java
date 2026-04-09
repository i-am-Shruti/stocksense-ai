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
    private OtpService otpService;

    @org.springframework.beans.factory.annotation.Autowired
    public void setOtpService(OtpService otpService) {
        this.otpService = otpService;
    }

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
            
            otpService.generateOtp(email);
            log.info("Forgot password OTP sent to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send OTP: {}", e.getMessage());
            // Don't rethrow - we don't want to reveal if email exists or not
        }
    }

    public String sendForgotPasswordOtp(String email) {
        sendForgotPasswordOtpAsync(email);
        // Always return success to prevent email enumeration
        return "If the email is registered, an OTP has been sent";
    }

    @CacheEvict(value = "userProfile", key = "#email")
    public String resetPassword(String email, String otp, String newPassword) {
        if (!otpService.validateOtp(email, otp)) {
            throw new RuntimeException("Invalid or expired OTP");
        }
        
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("Password reset for: {}", email);
        return "Password reset successful";
    }

    @Async
    public void sendRegistrationOtpAsync(String email) {
        try {
            otpService.generateOtp(email);
            log.info("Registration OTP sent to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send OTP: {}", e.getMessage());
        }
    }

    public String sendRegistrationOtp(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("Email already registered");
        }
        
        sendRegistrationOtpAsync(email);
        return "OTP sent to your email";
    }

    public AuthResponseDTO verifyAndRegister(String email, String otp, String name, String password) {
        if (!otpService.validateOtp(email, otp)) {
            throw new RuntimeException("Invalid or expired OTP");
        }
        
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

    public boolean validateOtp(String email, String otp) {
        return otpService.validateOtp(email, otp);
    }

    @CacheEvict(value = {"userProfile", "userEmail"}, allEntries = true)
    public void deleteAccount(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        userRepository.delete(user);
        log.info("Account deleted for: {}", email);
    }

}

