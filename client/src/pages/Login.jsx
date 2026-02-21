import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate, Link } from 'react-router-dom';
import { Bus, User, Shield } from 'lucide-react';

const Login = () => {
    const [role, setRole] = useState('parent');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, googleLoginHandler } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleManualLogin = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            await googleLoginHandler(credentialResponse, role);
            navigate('/dashboard');
        } catch (err) {
            setError(err);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <h2 className="text-3xl font-bold text-center mb-6 text-indigo-600">Welcome Back</h2>

                {/* Role Selector */}
                <div className="flex justify-center space-x-4 mb-8">
                    <button onClick={() => setRole('parent')} className={`p-3 rounded-lg flex flex-col items-center gap-2 border-2 transition-all ${role === 'parent' ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-gray-200 text-gray-500 hover:border-indigo-300'}`}>
                        <User size={24} />
                        <span className="text-xs font-medium">Parent</span>
                    </button>
                    <button onClick={() => setRole('driver')} className={`p-3 rounded-lg flex flex-col items-center gap-2 border-2 transition-all ${role === 'driver' ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-gray-200 text-gray-500 hover:border-indigo-300'}`}>
                        <Bus size={24} />
                        <span className="text-xs font-medium">Driver</span>
                    </button>
                    <button onClick={() => setRole('admin')} className={`p-3 rounded-lg flex flex-col items-center gap-2 border-2 transition-all ${role === 'admin' ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-gray-200 text-gray-500 hover:border-indigo-300'}`}>
                        <Shield size={24} />
                        <span className="text-xs font-medium">Admin</span>
                    </button>
                </div>

                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleManualLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="••••••••"
                            required
                        />
                        <div className="text-right mt-1">
                            <Link to="/forgot-password" className="text-xs text-indigo-500 hover:underline">
                                Forgot Password?
                            </Link>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                        Log In as {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>

                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or continue with</span>
                    </div>
                </div>

                <div className="flex justify-center">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError('Google Login Failed')}
                        useOneTap
                    />
                </div>

                <p className="mt-8 text-center text-sm text-gray-600">
                    Don't have an account? <Link to="/register" className="text-indigo-600 hover:underline font-medium">Sign up</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
