import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { googleLogout } from '@react-oauth/google';
import { API_URL } from '../constants';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            setUser(JSON.parse(userInfo));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            const { data } = await axios.post(`${API_URL}/auth/login`, { email, password }, config);

            localStorage.setItem('userInfo', JSON.stringify(data));
            setUser(data);
            return data;
        } catch (error) {
            throw error.response?.data?.message || 'Login failed';
        }
    };

    const register = async (name, email, password, role) => {
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            const { data } = await axios.post(`${API_URL}/auth/register`, { name, email, password, role }, config);

            localStorage.setItem('userInfo', JSON.stringify(data));
            setUser(data);
            return data;
        } catch (error) {
            throw error.response?.data?.message || 'Registration failed';
        }
    };

    const googleLoginHandler = async (tokenObj, role) => {
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                },
            };
            // Verify with backend
            const { data } = await axios.post(`${API_URL}/auth/google`, { token: tokenObj.credential, role }, config);

            localStorage.setItem('userInfo', JSON.stringify(data));
            setUser(data);
            return data;
        } catch (error) {
            throw error.response?.data?.message || 'Google Login failed';
        }
    }

    const logout = () => {
        googleLogout();
        localStorage.removeItem('userInfo');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, googleLoginHandler, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
