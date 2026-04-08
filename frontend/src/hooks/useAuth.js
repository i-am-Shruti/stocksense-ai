import { useContext, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error(
        'useAuth must be used within AuthProvider'
    );
    return context;
};

export const isAuthenticated = () => {
    return !!localStorage.getItem('token');
};

export const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
};

import { useEffect } from 'react';
