package com.stocksense.backend.model;

import jakarta.persistence.*;
import  jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import  lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")

public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id ;

    @NotBlank(message = "name is required")
    @Column(name ="name" , nullable = false)
    private String name;

    @Email(message = "Invalid email format")      // validation: must be valid email
    @NotBlank(message = "Email is required")
    @Column(name = "email", nullable = false, unique = true)  // unique = no duplicate emails
    private String email;

    @NotBlank(message = "Password is required")
    @Column(name = "password", nullable = false)
    private String password;                     // will store encrypted password (bcrypt)

    @Column(name = "role")
    private String role = "USER"; // default role is USER (can be ADMIN)

    @Column(name = "created_at")
    private LocalDateTime createdAt;             // when was this user created

    @Column(name = "is_active")
    private Boolean isActive = true;             // is account active or disabled?

    @PrePersist   // runs automatically BEFORE saving to database for first time
    protected void onCreate() {
        createdAt = LocalDateTime.now();         // sets current time automatically

    }
}
