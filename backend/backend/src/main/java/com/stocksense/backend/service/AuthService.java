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
import  lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;


@Service
@RequiredArgsConstructor
@Slf4j

public class AuthService {
    // final = constructor injection (recommended way)
    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    //REGISTER

    public  AuthResponseDTO register(RegisterRequestDTO request){
        log.info("Register attempt for email: {}", request.getEmail());
        // {} is placeholder — Slf4j fills it with actual value
        // Output: "Register attempt for email: shruti@gmail.com"

        if(userRepository.existsByEmail(request.getEmail())) {
            log.warn("Email already exists: {}", request.getEmail());
            throw new EmailAlreadyExistsException("Email already registered");

        }
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());

        // Step 3: Encrypt password before saving
        // NEVER save plain text password in database!
        String encryptedPassword = passwordEncoder.encode(request.getPassword());

        user.setPassword(encryptedPassword);
        user.setRole("USER");        // default role
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

    public  AuthResponseDTO login(LoginRequestDTO request) {
        log.info("Login attempt for email: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    log.warn("User not found: {}", request.getEmail());
                    return new RuntimeException("Invalid email or password");
                });
//
//        if (!user.getIsActive()) {
//            log.warn("Inactive account login attemot; {}", request.getEmail());
//            throw new InvalidCredentialsException("Account is disabled!");
//        }
//
//        boolean passwordMatches = passwordEncoder.matches(
//                request.getPassword(),
//                user.getPassword()
//        );
//
//        if (!passwordMatches) {
//            log.warn("Invalid password for: {}", request.getEmail());
//            throw new InvalidCredentialsException("Invalid email or password!");
//        }
        // ONE LINE replaces steps 1, 2, 3!
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        // ↑ internally does:
        // → find user by email (UserDetailsService)
        // → check password (PasswordEncoder)
        // → check if account active
        // → throws exception if any check fails

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

        public User getUserProfile(String email) {
            return userRepository.findByEmail(email)
                    .orElseThrow(() ->
                            new RuntimeException("User not found!")
                    );
        }

    public String sendForgotPasswordOtp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email not registered"));
        
        otpService.generateOtp(email);
        log.info("Forgot password OTP sent to: {}", email);
        return "OTP sent to your email";
    }

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

    public String sendRegistrationOtp(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("Email already registered");
        }
        
        otpService.generateOtp(email);
        log.info("Registration OTP sent to: {}", email);
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

    private OtpService otpService;

    @org.springframework.beans.factory.annotation.Autowired
    public void setOtpService(OtpService otpService) {
        this.otpService = otpService;
    }

    public boolean validateOtp(String email, String otp) {
        return otpService.validateOtp(email, otp);
    }

