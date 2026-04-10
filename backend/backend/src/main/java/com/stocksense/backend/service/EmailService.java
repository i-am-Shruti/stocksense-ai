package com.stocksense.backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@stocksense.ai}")
    private String fromEmail;

    @Value("${mail.from.name:StockSense AI}")
    private String fromName;

    @Value("${app.name:StockSense AI}")
    private String appName;

    @Async
    public void sendOtpEmail(String toEmail, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Your " + appName + " OTP Verification Code");

            String htmlContent = buildOtpEmailHtml(otp);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("OTP email sent successfully to: {}", toEmail);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Failed to send OTP email to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendPasswordResetEmail(String toEmail, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Reset Your " + appName + " Password");

            String htmlContent = buildPasswordResetEmailHtml(otp);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Password reset email sent successfully to: {}", toEmail);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Failed to send password reset email to {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildOtpEmailHtml(String otp) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; background-color: #0a0a1a; color: #ffffff; padding: 20px;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #1a1a2e; border-radius: 16px; padding: 40px; border: 1px solid #00d4ff33;">
                    <h1 style="color: #00d4ff; text-align: center; margin: 0 0 10px 0;">📈 %s</h1>
                    <p style="color: #00d4ff; text-align: center; font-size: 14px; margin: 0 0 20px 0;">New User Registration</p>
                    <h2 style="text-align: center; color: #ffffff; margin: 0 0 20px 0;">Verify Your Email</h2>
                    <p style="color: #aaaaaa; text-align: center;">Hello!</p>
                    <p style="color: #aaaaaa; text-align: center;">Your OTP for new user registration is:</p>
                    <div style="background-color: #0f0f2e; border: 2px dashed #00d4ff; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #00d4ff; letter-spacing: 8px;">%s</span>
                    </div>
                    <p style="color: #ff4757; text-align: center; font-size: 14px;">⚠️ This OTP will expire in <strong>5 minutes</strong></p>
                    <hr style="border: none; border-top: 1px solid #333366; margin: 20px 0;">
                    <p style="color: #666666; text-align: center; font-size: 12px;">
                        If you didn't create an account on StockSense AI, please ignore this email.
                    </p>
                </div>
            </body>
            </html>
            """.formatted(appName, otp);
    }

    private String buildPasswordResetEmailHtml(String otp) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; background-color: #0a0a1a; color: #ffffff; padding: 20px;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #1a1a2e; border-radius: 16px; padding: 40px; border: 1px solid #00d4ff33;">
                    <h1 style="color: #00d4ff; text-align: center; margin: 0 0 10px 0;">📈 %s</h1>
                    <p style="color: #00d4ff; text-align: center; font-size: 14px; margin: 0 0 20px 0;">Password Reset Request</p>
                    <h2 style="text-align: center; color: #ffffff; margin: 0 0 20px 0;">Reset Your Password</h2>
                    <p style="color: #aaaaaa; text-align: center;">Hello!</p>
                    <p style="color: #aaaaaa; text-align: center;">Your password reset OTP is:</p>
                    <div style="background-color: #0f0f2e; border: 2px dashed #00d4ff; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #00d4ff; letter-spacing: 8px;">%s</span>
                    </div>
                    <p style="color: #ff4757; text-align: center; font-size: 14px;">⚠️ This OTP will expire in <strong>5 minutes</strong></p>
                    <hr style="border: none; border-top: 1px solid #333366; margin: 20px 0;">
                    <p style="color: #666666; text-align: center; font-size: 12px;">
                        If you didn't request a password reset, please ignore this email.
                    </p>
                </div>
            </body>
            </html>
            """.formatted(appName, otp);
    }
}
