import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

const ForgotPassword = () => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [otpExpiry, setOtpExpiry] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (step === 2 && otpExpiry) {
            const timer = setInterval(() => {
                const remaining = Math.max(0, Math.floor((otpExpiry - Date.now()) / 1000));
                setTimeLeft(remaining);
                if (remaining <= 0) {
                    clearInterval(timer);
                    toast.error('OTP expired! Please request a new one.');
                    setStep(1);
                    setOtpExpiry(null);
                }
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [step, otpExpiry]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await authAPI.forgotPassword({ email });
            toast.success('OTP sent to your email!');
            setOtpExpiry(Date.now() + 5 * 60 * 1000);
            setTimeLeft(5 * 60);
            setStep(2);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match!');
            return;
        }
        
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        
        setLoading(true);
        try {
            await authAPI.resetPassword({ email, otp, newPassword });
            toast.success('Password reset successful!');
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>Reset Password</h1>
                
                {step === 1 && (
                    <form onSubmit={handleSendOtp}>
                        <p style={styles.subtitle}>Enter your email to receive OTP</p>
                        <div style={styles.field}>
                            <label htmlFor="email" style={styles.label}>Email</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Your email"
                                style={styles.input}
                                required
                                autoComplete="email"
                            />
                        </div>
                        <button type="submit" style={styles.button} disabled={loading}>
                            {loading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleResetPassword}>
                        <p style={styles.subtitle}>Enter OTP and new password</p>
                        <div style={styles.field}>
                            <label htmlFor="otp" style={styles.label}>OTP</label>
                            <input
                                id="otp"
                                name="otp"
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="Enter 6-digit OTP"
                                style={styles.input}
                                required
                                maxLength={6}
                                autoComplete="one-time-code"
                            />
                        </div>
                        <div style={styles.timerContainer}>
                            <span style={{
                                ...styles.timerText,
                                color: timeLeft <= 60 ? '#ff4757' : '#00d4ff'
                            }}>
                                ⏱️ OTP expires in: {formatTime(timeLeft)}
                            </span>
                        </div>
                        <div style={styles.field}>
                            <label htmlFor="newPassword" style={styles.label}>New Password</label>
                            <input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="New password"
                                style={styles.input}
                                required
                                autoComplete="new-password"
                            />
                        </div>
                        <div style={styles.field}>
                            <label htmlFor="confirmPassword" style={styles.label}>Confirm Password</label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm password"
                                style={styles.input}
                                required
                                autoComplete="new-password"
                            />
                        </div>
                        <button type="submit" style={styles.button} disabled={loading}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <p style={styles.linkText}>
                    <Link to="/login" style={styles.link}>Back to Login</Link>
                </p>
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#0a0a1a',
    },
    card: {
        backgroundColor: '#1a1a2e',
        padding: '40px',
        borderRadius: '16px',
        width: '400px',
    },
    title: {
        color: '#00d4ff',
        textAlign: 'center',
        margin: '0 0 10px 0',
    },
    subtitle: {
        color: '#aaa',
        textAlign: 'center',
        marginBottom: '20px',
    },
    field: { marginBottom: '15px' },
    timerContainer: {
        textAlign: 'center',
        marginBottom: '15px'
    },
    timerText: {
        fontSize: '14px',
        fontWeight: 'bold'
    },
    label: {
        color: '#aaaaaa',
        display: 'block',
        marginBottom: '6px',
        fontSize: '14px'
    },
    input: {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #333',
        backgroundColor: '#0f0f2e',
        color: '#fff',
        fontSize: '16px',
        boxSizing: 'border-box',
    },
    button: {
        width: '100%',
        padding: '14px',
        backgroundColor: '#00d4ff',
        color: '#000',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
    },
    linkText: {
        color: '#aaa',
        textAlign: 'center',
        marginTop: '20px',
    },
    link: { color: '#00d4ff' }
};

export default ForgotPassword;