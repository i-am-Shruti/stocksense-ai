package com.stocksense.backend.utils;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import  org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.security.Key;
import java.util.Date;

@Component
public class JwtUtils {
    @Value("${jwt.secret}")
    // reads value from application.properties
    // jwt.secret=stocksense_super_secret_key_2026
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    // Generate token from email
    public  String generateToken(String email){
        return Jwts.builder()
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis()+jwtExpiration))
                .signWith(getSignKey())
                .compact();
    }

    // Extract email from token
    public String getEmailFromToken(String token){
        return Jwts.parserBuilder()
                .setSigningKey(getSignKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject(); // returns email we stored
    }

    public  boolean validateToken(String token){
        try{
            Jwts.parserBuilder()
                    .setSigningKey(getSignKey())
                    .build()
                    .parseClaimsJws((token));
            return true;
        }catch (JwtException e){
            return false;
        }
    }

    public Boolean isTokenExpired(String token){
        Date expiartion = Jwts.parserBuilder()
                .setSigningKey(getSignKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getExpiration();
        return expiartion.before(new Date());
    }

    private Key getSignKey(){
        // jwtSecret is a String from application.properties:
// jwt.secret=stocksense_super_secret_key_2026
        // .getBytes() converts String → array of bytes
        byte[] keyBytes = jwtSecret.getBytes();
        // HMAC = Hash-based Message Authentication Code
       // SHA  = Secure Hash Algorithm
        return  Keys.hmacShaKeyFor(keyBytes);
    }

}
