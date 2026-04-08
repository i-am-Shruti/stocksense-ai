package com.stocksense.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import  org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import  org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.web.client.RestTemplate;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;


@Configuration // tells Spring: this class contains bean definitions
@EnableWebSecurity
@RequiredArgsConstructor

class SecurityConfig {

    private final JwtFilter jwtFilter;
    private final UserDetailsService userDetailsService;
    private final CorsConfigurationSource corsConfigurationSource;

    @Bean
    /*

        I added it proactively — not because of the error, but because without it you'd hit this problem during Postman testing:
        POST /api/auth/register
        → 401 Unauthorized ❌
        → 403 Forbidden    ❌
        Because Spring Security blocks ALL endpoints by default!
        Default Spring Security behavior:
        Every request → needs authentication
        /api/auth/register → BLOCKED ❌
        /api/auth/login    → BLOCKED ❌
        /api/stocks/**     → BLOCKED ❌

        What filterChain actually does:
        java.authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/auth/**").permitAll()
        ↑ allow register/login WITHOUT token
     */
    public  SecurityFilterChain filterChain(HttpSecurity http) throws Exception{
        /*
        ## What each line does now:
```
csrf.disable()
→ turn off CSRF protection
→ safe because we use JWT not cookies

sessionCreationPolicy(STATELESS)
→ don't create HTTP sessions
→ each request must carry JWT token

exceptionHandling → HttpStatus.UNAUTHORIZED
→ when request has no/invalid token
→ return 401 instead of 403

requestMatchers("/api/auth/**").permitAll()
→ register and login = no token needed

anyRequest().authenticated()
→ EVERYTHING else needs valid JWT token
→ includes /api/stocks/** automatically!

addFilterBefore(jwtFilter, ...)
→ run our JWT check first
→ then Spring's default auth check
         */
        http.
                cors(cors-> cors.configurationSource(this.corsConfigurationSource))
                .csrf(csrf-> csrf.disable())
                .sessionManagement(session-> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex->ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                // ↑ ADD THIS LINE — tells Spring which auth provider to use
                .authorizeHttpRequests(auth->auth.requestMatchers("/api/auth/**").permitAll().requestMatchers("/api/stocks/**").authenticated()
                        .anyRequest().authenticated()
                        // ↑ everything else needs token — stocks included!
                ).addFilterBefore(jwtFilter,
                        UsernamePasswordAuthenticationFilter.class); //Run MY JwtFilter BEFORE Spring's defaultUsernamePasswordAuthenticationFilter
        return http.build();
    }

    @Bean // tells Spring: this method RETURNS a bean, manage it!
    public  PasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
        // BCrypt is the industry standard password hashing algorithm
        // "password123" →F "$2a$10$xK8J3mN9pQ2rL5vH7wY4uO..."
        // Every time you hash same password → DIFFERENT result
        // But BCrypt can still VERIFY if password matches hash!
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
