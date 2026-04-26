import { useContext, useState, useCallback, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error(
        'useAuth must be used within AuthProvider'
    );
    return context;
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