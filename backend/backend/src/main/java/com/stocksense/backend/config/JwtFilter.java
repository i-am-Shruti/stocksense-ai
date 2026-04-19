package com.stocksense.backend.config;

import com.stocksense.backend.utils.JwtUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
/*
 JwtFilter (our custom filter)
│     → reads token from header
│     → validates token
│     → sets authentication
 */
public class JwtFilter extends OncePerRequestFilter {
    // OncePerRequestFilter = runs exactly ONCE per request
    // (not multiple times even with redirects)

    private final JwtUtils jwtUtils;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        log.debug("JwtFilter running for: {} method: {}", request.getRequestURI(), request.getMethod());

        // Step 1: Get Authorization header from request
        //String authHeader = request.getHeader("Authorization");
        // Frontend sends: Authorization: Bearer eyJhbGci...
        //                              ↑ must start with "Bearer "

        String token = null;
        String email = null;

        // Try Authorization header first (Bearer token)
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
            // "Bearer eyJhbGci..." → "eyJhbGci..."
            // substring(7) removes first 7 characters "Bearer "
        }
        // If no header token, try cookie
        if (token == null) {
            Cookie[] cookies = request.getCookies();
            if (cookies != null) {
                for (Cookie cookie : cookies) {
                    if ("token".equals(cookie.getName())) {
                        token = cookie.getValue();
                        break;
                    }
                }
            }
        }

        // Extract email from token
        if (token != null && !token.isEmpty()) {
            try {
                email = jwtUtils.getEmailFromToken(token);
                // extract email from token payload
            } catch (Exception e) {
                log.error("Invalid JWT token: {}", e.getMessage());
            }
        }

        // Step 3: Validate token and set authentication
        if (email != null &&
                SecurityContextHolder.getContext().getAuthentication() == null) {
            // SecurityContextHolder = Spring's security storage , stores current user in thread-local storage
            // if authentication is null = user not yet authenticated , YES null → proceed to authenticate

            //Load user from DB   → UserDetailsService
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);
            // load user from database by email

            if (jwtUtils.validateToken(token)) {
                // token is valid → create authentication object
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );

                authToken.setDetails(
                        new WebAuthenticationDetailsSource()
                                .buildDetails(request)
                );

                // Step 4: Store authentication(authenticated user) in SecurityContext
                SecurityContextHolder.getContext()
                        .setAuthentication(authToken);
                // Now Spring Security knows: this user is authenticated ✅
                log.debug("JWT authentication set for: {}", email);
            }
        }

        // Step 5: Continue to next filter/controller
        filterChain.doFilter(request, response);
    }
}