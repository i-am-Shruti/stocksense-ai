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

    }

