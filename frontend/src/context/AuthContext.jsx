import { createContext, useState, useEffect, useMemo } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const register = async (name, email, password) => {
        const response = await authAPI.register({ name, email, password });
        const { token, ...userData } = response.data;
        // ✅ Token is in HttpOnly cookie (secure, auto-sent by browser)
        // ❌ Don't save null token to localStorage - defeats the security purpose
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return response.data;
    };

    const login = async (email, password) => {
        const response = await authAPI.login({ email, password });
        const { token, ...userData } = response.data;
        // ✅ Token is in HttpOnly cookie (secure, auto-sent by browser)
        // ❌ Don't save null token to localStorage - defeats the security purpose
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return response.data;
    };

    const logout = async () => {
        try {
            await authAPI.logout();
        } catch (e) {
            console.warn('⚠️ Logout API Error:', e);
            console.error('Error details:', {
                message: e.message,
                status: e.response?.status,
                statusText: e.response?.statusText,
                data: e.response?.data,
                error: e
            });
            // Continue with local logout even if backend call fails
        }
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        console.log('✅ User logged out successfully - localStorage cleared');
        setUser(null);
    };

    const isAuthenticated = () => {
        return !!localStorage.getItem('user');
    };

    const value = useMemo(() => ({
        user, loading,
        register, login,
        logout, isAuthenticated
    }), [user, loading]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export { AuthContext };