import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const { register } = useAuth();
    const navigate = useNavigate();

    const validateForm = () => {
        const newErrors = {};
        
        if (!name.trim()) {
            newErrors.name = 'Name is required';
        } else if (name.length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }
        
        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Please enter a valid email';
        }
        
        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setLoading(true);
        try {
            await register(name, email, password);
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
                <h2 style={styles.subtitle}>Create Account</h2>
                <form onSubmit={handleSubmit}>
                    <div style={styles.field}>
                        <label style={styles.label}>
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setErrors({...errors, name: ''});
                            }}
                            placeholder="Shruti Priya"
                            style={getInputStyle('name')}
                            disabled={loading}
                        />
                        {errors.name && <span style={styles.errorText}>{errors.name}</span>}
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setErrors({...errors, email: ''});
                            }}
                            placeholder="shruti@gmail.com"
                            style={getInputStyle('email')}
                            disabled={loading}
                        />
                        {errors.email && <span style={styles.errorText}>{errors.email}</span>}
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setErrors({...errors, password: ''});
                            }}
                            placeholder="Min 6 characters"
                            style={getInputStyle('password')}
                            disabled={loading}
                        />
                        {errors.password && <span style={styles.errorText}>{errors.password}</span>}
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
                                Creating Account...
                            </span>
                        ) : 'Create Account'}
                    </button>
                </form>
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

export default Register;
