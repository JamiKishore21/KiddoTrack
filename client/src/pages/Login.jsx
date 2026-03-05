import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate, Link } from 'react-router-dom';
import { Bus, User, Shield, ArrowLeft, Loader2, Mail, Lock, Eye, EyeOff, UserCircle, ChevronDown } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const Login = () => {
    const [role, setRole] = useState('parent');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, googleLoginHandler } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleManualLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
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

    const roles = [
        { id: 'parent', label: 'Parent', icon: User },
        { id: 'student', label: 'Student', icon: UserCircle },
        { id: 'driver', label: 'Driver', icon: Bus },
        { id: 'admin', label: 'Admin', icon: Shield },
    ];

    return (
        <div className="min-h-screen-safe flex flex-col
            bg-surface-50 dark:bg-surface-950">

            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-3">
                <Link to="/" className="flex items-center gap-1.5 text-surface-500 dark:text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 font-medium text-sm transition-colors">
                    <ArrowLeft size={18} /> Back
                </Link>
                <ThemeToggle />
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center px-4 pb-8">
                <div className="card p-6 sm:p-8 w-full max-w-md animate-fade-in">

                    {/* Logo & Header */}
                    <div className="text-center mb-6">
                        <div className="inline-flex bg-white dark:bg-surface-800 p-1.5 rounded-2xl mb-4 shadow-sm border border-surface-100 dark:border-surface-700/50">
                            <img src="/logo.png" alt="KiddoTrack Logo" className="w-16 h-12 object-contain" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white">Welcome Back</h2>
                        <p className="text-surface-400 dark:text-surface-500 text-sm mt-1">Sign in to continue to KiddoTrack</p>
                    </div>

                    {/* Role Selector — Dropdown */}
                    <div className="relative mb-6">
                        <label className="label">I am a...</label>
                        <div className="input-icon-wrapper">
                            {React.createElement(roles.find(r => r.id === role)?.icon || User, {
                                size: 18,
                                className: "input-icon"
                            })}
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="input appearance-none pr-10"
                            >
                                {roles.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl mb-4 text-sm font-medium animate-slide-down">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleManualLogin} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="label">Email</label>
                            <div className="input-icon-wrapper">
                                <Mail size={18} className="input-icon" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input"
                                    placeholder="you@example.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="label mb-0">Password</label>
                                <Link to="/forgot-password" id="forgot-password-link" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                                    Forgot Password?
                                </Link>
                            </div>
                            <div className="input-icon-wrapper">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input pr-11"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-400 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                            {loading ? <Loader2 size={20} className="animate-spin" /> : null}
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    {/* Terms */}
                    <p className="text-xs text-center text-surface-400 dark:text-surface-500 mt-4 leading-relaxed">
                        By continuing, you agree to our{' '}
                        <span className="text-brand-500 dark:text-brand-400 cursor-pointer">Terms</span> and{' '}
                        <span className="text-brand-500 dark:text-brand-400 cursor-pointer">Privacy Policy</span>
                    </p>

                    <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-surface-200 dark:border-surface-700/40"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-3 bg-white dark:bg-surface-800 text-surface-400 dark:text-surface-500">or</span>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Google Login Failed')}
                            useOneTap
                            width="320"
                            shape="pill"
                        />
                    </div>


                    {/* Trust section */}
                    <div className="mt-6 flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-2 text-xs text-surface-400 dark:text-surface-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                            Secure encrypted authentication
                        </div>
                        <div className="flex items-center gap-2 text-xs text-surface-400 dark:text-surface-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                            Safe data storage
                        </div>
                    </div>

                    <p className="mt-5 text-center text-sm text-surface-500 dark:text-surface-400">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-brand-500 dark:text-brand-400 hover:underline font-semibold">Sign up</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
