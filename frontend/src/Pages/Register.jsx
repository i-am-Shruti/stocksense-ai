import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import { authAPI } from '../services/api';

const Register = () => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [otpExpiry, setOtpExpiry] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const { register } = useAuth();
    const navigate = useNavigate();

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

    const validateEmail = () => {
        const newErrors = {};
        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Please enter a valid email';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSendOtp = async (e) => {
        e?.preventDefault();
        if (!validateEmail()) return;
        
        setLoading(true);
        try {
            await authAPI.sendOtp(email);
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

    const handleVerifyOtp = async (e) => {
        e?.preventDefault();
        if (!otp.trim()) {
            toast.error('Please enter OTP');
            return;
        }
        
        setLoading(true);
        try {
            await authAPI.verifyOtp({ email, otp });
            toast.success('Email verified! Set your password.');
            setStep(3);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const validatePassword = () => {
        const newErrors = {};
        
        if (!name.trim()) {
            newErrors.name = 'Name is required';
        } else if (name.length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }
        
        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }
        
        if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        
        if (!validatePassword()) {
            return;
        }
        
        setLoading(true);
        try {
            const response = await authAPI.register({
                email,
                name,
                password,
                otp,
                verified: true
            });
            const { token, ...userData } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            toast.success('Registration successful! Welcome to StockSense AI!');
            navigate('/dashboard');
        } catch (error) {
            const message = error.response?.data?.message || 'Registration failed!';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const getInputStyle = (field) => ({
        ...styles.input,
        borderColor: errors[field] ? '#ff4757' : '#333366'
    });

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>📈 StockSense AI</h1>
                <h2 style={styles.subtitle}>
                    {step === 1 && 'Verify Email'}
                    {step === 2 && 'Enter OTP'}
                    {step === 3 && 'Set Password'}
                </h2>
                
                {step === 1 && (
                    <form onSubmit={handleSendOtp}>
                        <div style={styles.field}>
                            <label htmlFor="email" style={styles.label}>Email</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setErrors({...errors, email: ''});
                                }}
                                placeholder="shruti@gmail.com"
                                style={getInputStyle('email')}
                                disabled={loading}
                                autoComplete="email"
                            />
                            {errors.email && <span style={styles.errorText}>{errors.email}</span>}
                        </div>
                        <button
                            type="submit"
                            style={{
                                ...styles.button,
                                opacity: loading ? 0.7 : 1,
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                            disabled={loading}
                        >
                            {loading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOtp}>
                        <div style={styles.field}>
                            <label htmlFor="otp" style={styles.label}>Enter OTP sent to {email}</label>
                            <input
                                id="otp"
                                name="otp"
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="Enter 6-digit OTP"
                                style={styles.input}
                                maxLength={6}
                                disabled={loading}
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
                        <div style={styles.buttonRow}>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                style={styles.backBtn}
                                disabled={loading}
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                style={{
                                    ...styles.button,
                                    opacity: loading ? 0.7 : 1,
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                                disabled={loading}
                            >
                                {loading ? 'Verifying...' : 'Verify OTP'}
                            </button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleRegister}>
                        <div style={styles.field}>
                            <label htmlFor="name" style={styles.label}>Full Name</label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setErrors({...errors, name: ''});
                                }}
                                placeholder="Shruti Priya"
                                style={getInputStyle('name')}
                                disabled={loading}
                                autoComplete="name"
                            />
                            {errors.name && <span style={styles.errorText}>{errors.name}</span>}
                        </div>
                        <div style={styles.field}>
                            <label htmlFor="password" style={styles.label}>Password</label>
                            <div style={styles.passwordWrapper}>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setErrors({...errors, password: ''});
                                    }}
                                    placeholder="Min 6 characters"
                                    style={getInputStyle('password')}
                                    disabled={loading}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    style={styles.showPasswordBtn}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {errors.password && <span style={styles.errorText}>{errors.password}</span>}
                        </div>
                        <div style={styles.field}>
                            <label htmlFor="confirmPassword" style={styles.label}>Confirm Password</label>
                            <div style={styles.passwordWrapper}>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        setErrors({...errors, confirmPassword: ''});
                                    }}
                                    placeholder="Confirm password"
                                    style={getInputStyle('confirmPassword')}
                                    disabled={loading}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    style={styles.showPasswordBtn}
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {errors.confirmPassword && <span style={styles.errorText}>{errors.confirmPassword}</span>}
                        </div>
                        <div style={styles.buttonRow}>
                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                style={styles.backBtn}
                                disabled={loading}
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                style={{
                                    ...styles.button,
                                    opacity: loading ? 0.7 : 1,
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                                disabled={loading}
                            >
                                {loading ? (
                                    <span style={styles.spinnerContainer}>
                                        <span style={styles.spinner}></span>
                                        Creating...
                                    </span>
                                ) : 'Create Account'}
                            </button>
                        </div>
                    </form>
                )}
                
                <p style={styles.linkText}>
                    Already have an account?{' '}
                    <Link to="/login" style={styles.link}>
                        Login here
                    </Link>
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
        fontFamily: 'Arial, sans-serif'
    },
    card: {
        backgroundColor: '#1a1a2e',
        padding: '40px',
        borderRadius: '16px',
        width: '400px',
        boxShadow: '0 8px 32px rgba(0, 212, 255, 0.1)',
        border: '1px solid #00d4ff33'
    },
    title: {
        color: '#00d4ff',
        textAlign: 'center',
        margin: '0 0 8px 0',
        fontSize: '28px'
    },
    subtitle: {
        color: '#ffffff',
        textAlign: 'center',
        margin: '0 0 32px 0',
        fontWeight: 'normal'
    },
    field: { marginBottom: '20px' },
    timerContainer: {
        textAlign: 'center',
        marginBottom: '20px'
    },
    timerText: {
        fontSize: '14px',
        fontWeight: 'bold'
    },
    passwordWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
    },
    showPasswordBtn: {
        position: 'absolute',
        right: '12px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
        padding: '4px'
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
        border: '1px solid #333366',
        backgroundColor: '#0f0f2e',
        color: '#ffffff',
        fontSize: '16px',
        boxSizing: 'border-box',
        outline: 'none',
        transition: 'border-color 0.2s'
    },
    errorText: {
        color: '#ff4757',
        fontSize: '12px',
        marginTop: '4px',
        display: 'block'
    },
    button: {
        width: '100%',
        padding: '14px',
        backgroundColor: '#00d4ff',
        color: '#000000',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '8px',
        transition: 'all 0.2s'
    },
    buttonRow: {
        display: 'flex',
        gap: '10px',
        marginTop: '8px'
    },
    backBtn: {
        flex: 1,
        padding: '14px',
        backgroundColor: '#333',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    spinnerContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px'
    },
    spinner: {
        width: '16px',
        height: '16px',
        border: '2px solid #000',
        borderTop: '2px solid transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
    },
    linkText: {
        color: '#aaaaaa',
        textAlign: 'center',
        marginTop: '20px',
        fontSize: '14px'
    },
    link: { color: '#00d4ff' }
};

export default Register;
