import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            toast.success('Login successful!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(
                error.response?.data?.message || 'Login failed!'
            );
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
                        <label style={styles.label}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)}
                            placeholder="shruti@gmail.com"
                            style={styles.input}
                            required
                        />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={styles.input}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        style={{
                            ...styles.button,
                            opacity: loading ? 0.7 : 1
                        }}
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                <p style={styles.linkText}>
                    Don't have an account?{' '}
                    <Link to="/register"
                          style={styles.link}>
                        Register here
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
        outline: 'none'
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
        marginTop: '8px'
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