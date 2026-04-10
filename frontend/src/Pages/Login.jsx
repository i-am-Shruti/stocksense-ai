import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email.trim()) {
            setEmailError('Email is required');
            return;
        }
        if (!validateEmail(email)) {
            setEmailError('Please enter a valid email');
            return;
        }
        setEmailError('');
        
        setLoading(true);
        try {
            await login(email, password);
            toast.success('Login successful!');
            navigate('/dashboard');
        } catch (error) {
            const message = error.response?.data?.message || 'Login failed! Please check your credentials.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>📈 StockSense AI</h1>
                <h2 style={styles.subtitle}>Login</h2>
                <form onSubmit={handleSubmit}>
                    <div style={styles.field}>
                        <label htmlFor="email" style={styles.label}>Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setEmailError('');
                            }}
                            placeholder="shruti@gmail.com"
                            style={{...styles.input, borderColor: emailError ? '#ff4757' : '#333366'}}
                            required
                            autoComplete="email"
                            disabled={loading}
                        />
                        {emailError && <span style={styles.errorText}>{emailError}</span>}
                    </div>
                    <div style={styles.field}>
                        <label htmlFor="password" style={styles.label}>
                            Password
                        </label>
                        <div style={styles.passwordWrapper}>
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)}
                                placeholder="••••••••••"
                                style={styles.input}
                                required
                                autoComplete="current-password"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                style={styles.showPasswordBtn}
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
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
                        {loading ? (
                            <span style={styles.spinnerContainer}>
                                <span style={styles.spinner}></span>
                                Logging in...
                            </span>
                        ) : 'Login'}
                    </button>
                </form>
                <p style={styles.linkText}>
                    Don't have an account?{' '}
                    <Link to="/register"
                          style={styles.link}>
                        Register here
                    </Link>
                </p>
                <p style={styles.linkText}>
                    <Link to="/forgot-password"
                          style={styles.link}>
                        Forgot Password?
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

export default Login;