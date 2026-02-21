import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate, Link } from 'react-router-dom';
import { Bus, User, Shield, ArrowLeft, Loader2, Mail, Lock, Eye, EyeOff, UserCircle } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState('parent');
    const { register, googleLoginHandler } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleManualRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await register(name, email, password, 'parent');
            navigate('/dashboard');
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            await googleLoginHandler(credentialResponse, 'parent');
            navigate('/dashboard');
        } catch (err) {
            setError(err);
        }
    };

    const roles = [
        { id: 'parent', label: 'Parent', icon: User },
        { id: 'driver', label: 'Driver', icon: Bus },
        { id: 'admin', label: 'Admin', icon: Shield },
    ];

    return (
        <div className="min-h-screen-safe flex flex-col bg-surface-50 dark:bg-surface-950">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-3">
                <Link to="/" className="flex items-center gap-1.5 text-surface-500 dark:text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 font-medium text-sm transition-colors">
                    <ArrowLeft size={18} /> Back
                </Link>
                <ThemeToggle />
            </div>

            <div className="flex-1 flex items-center justify-center px-4 pb-8">
                <div className="card p-6 sm:p-8 w-full max-w-md animate-fade-in">

                    <div className="text-center mb-6">
                        <div className="inline-flex bg-brand-100 dark:bg-brand-900/30 p-3.5 rounded-2xl mb-4">
                            <UserCircle size={28} className="text-brand-600 dark:text-brand-400" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white">Create Account</h2>
                        <p className="text-surface-400 dark:text-surface-500 text-sm mt-1">Join KiddoTrack today</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl mb-4 text-sm font-medium animate-slide-down">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleManualRegister} className="space-y-4">
                        <div>
                            <label className="label">Full Name</label>
                            <div className="input-icon-wrapper">
                                <UserCircle size={18} className="input-icon" />
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                                    className="input" placeholder="John Doe" required autoComplete="name" />
                            </div>
                        </div>
                        <div>
                            <label className="label">Email</label>
                            <div className="input-icon-wrapper">
                                <Mail size={18} className="input-icon" />
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="input" placeholder="you@example.com" required autoComplete="email" />
                            </div>
                        </div>
                        <div>
                            <label className="label">Password</label>
                            <div className="input-icon-wrapper">
                                <Lock size={18} className="input-icon" />
                                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="input pr-11" placeholder="••••••••" required autoComplete="new-password" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500 hover:text-surface-600 transition-colors">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                            {loading ? <Loader2 size={20} className="animate-spin" /> : null}
                            {loading ? 'Creating...' : 'Sign Up'}
                        </button>
                    </form>

                    <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-surface-200 dark:border-surface-700/40"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-3 bg-white dark:bg-surface-800 text-surface-400 dark:text-surface-500">or continue with</span>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Google Login Failed')} text="signup_with" width="320" shape="pill" />
                    </div>

                    <div className="mt-6 p-3 bg-brand-50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/20 rounded-xl">
                        <p className="text-xs text-center text-brand-700 dark:text-brand-300 flex items-center justify-center gap-2">
                            <Bus size={14} /> Driver accounts are created by the school admin.
                        </p>
                    </div>

                    <p className="mt-5 text-center text-sm text-surface-500 dark:text-surface-400">
                        Already have an account?{' '}
                        <Link to="/login" className="text-brand-500 dark:text-brand-400 hover:underline font-semibold">Log in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
