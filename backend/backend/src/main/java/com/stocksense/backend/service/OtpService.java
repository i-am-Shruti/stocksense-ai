package com.stocksense.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {
    
    private final ConcurrentHashMap<String, OtpData> otpStore = new ConcurrentHashMap<>();
    
    private static class OtpData {
        String otp;
        long expiryTime;
        
        OtpData(String otp, long expiryTime) {
            this.otp = otp;
            this.expiryTime = expiryTime;
        }
    }
    
    public String generateOtp(String email) {
        String otp = String.valueOf(new Random().nextInt(900000) + 100000);
        long expiryTime = System.currentTimeMillis() + (5 * 60 * 1000);
        
        otpStore.put(email, new OtpData(otp, expiryTime));
        
        log.info("═══════════════════════════════════════");
        log.info("OTP for {}: {}", email, otp);
        log.info("Expires in 5 minutes");
        log.info("═══════════════════════════════════════");
        
        return otp;
    }
    
    public boolean validateOtp(String email, String otp) {
        OtpData data = otpStore.get(email);
        
        if (data == null) {
            log.warn("No OTP found for {}", email);
            return false;
        }
        
        if (System.currentTimeMillis() > data.expiryTime) {
            otpStore.remove(email);
            log.warn("OTP expired for {}", email);
            return false;
        }
        
        if (!data.otp.equals(otp)) {
            log.warn("Invalid OTP for {}", email);
            return false;
        }
        
        otpStore.remove(email);
        log.info("OTP validated successfully for {}", email);
        return true;
    }
    
    public boolean hasOtp(String email) {
        OtpData data = otpStore.get(email);
        if (data == null) return false;
        if (System.currentTimeMillis() > data.expiryTime) {
            otpStore.remove(email);
            return false;
        }
        return true;
    }
}