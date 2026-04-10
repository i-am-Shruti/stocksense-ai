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
    private static final long OTP_EXPIRY_MS = 5 * 60 * 1000;
    
    public static class OtpExpiredException extends RuntimeException {
        public OtpExpiredException(String message) {
            super(message);
        }
    }
    
    public static class OtpInvalidException extends RuntimeException {
        public OtpInvalidException(String message) {
            super(message);
        }
    }
    
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
        long expiryTime = System.currentTimeMillis() + OTP_EXPIRY_MS;
        
        otpStore.put(email, new OtpData(otp, expiryTime));
        
        log.info("═══════════════════════════════════════");
        log.info("OTP for {}: {}", email, otp);
        log.info("Expires in 5 minutes");
        log.info("═══════════════════════════════════════");
        
        return otp;
    }
    
    public void validateOtp(String email, String otp) {
        OtpData data = otpStore.get(email);
        
        if (data == null) {
            log.warn("No OTP found for {}", email);
            throw new OtpInvalidException("Invalid or expired OTP");
        }
        
        if (System.currentTimeMillis() > data.expiryTime) {
            otpStore.remove(email);
            log.warn("OTP expired for {}", email);
            throw new OtpExpiredException("OTP has expired. Please request a new one.");
        }
        
        if (!data.otp.equals(otp)) {
            log.warn("Invalid OTP for {}", email);
            throw new OtpInvalidException("Invalid OTP");
        }
        
        otpStore.remove(email);
        log.info("OTP validated successfully for {}", email);
    }
    
    public long getRemainingTime(String email) {
        OtpData data = otpStore.get(email);
        if (data == null) return 0;
        long remaining = data.expiryTime - System.currentTimeMillis();
        return remaining > 0 ? remaining : 0;
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