import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, Lock, CheckCircle, ArrowLeft, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { API_URL } from '../constants';

const STEPS = ['email', 'otp', 'password', 'done'];

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const API = `${API_URL}/auth`;

    // Helper to handle fetch responses
    const handleResponse = async (res) => {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await res.json();
        }
        throw new Error(`Server Error: ${res.status} ${res.statusText}`);
    };

    // Step 1 — Send OTP
    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${API}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await handleResponse(res);
            if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
            setSuccessMsg(data.message);
            setStep('otp');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 2 — Verify OTP
    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${API}/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });
            const data = await handleResponse(res);
            if (!res.ok) throw new Error(data.message || 'Invalid OTP');
            setResetToken(data.resetToken);
            setSuccessMsg('OTP verified! Set your new password below.');
            setStep('password');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 3 — Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resetToken, newPassword }),
            });
            const data = await handleResponse(res);
            if (!res.ok) throw new Error(data.message || 'Failed to reset password');
            setSuccessMsg(data.message);
            setStep('done');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const stepIndex = STEPS.indexOf(step);

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-4">
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 dark:opacity-10" />
            </div>
            <div className="bg-white dark:bg-surface-800 p-8 rounded-3xl shadow-glass-lg border border-surface-200 dark:border-surface-700/50 w-full max-w-md relative z-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    {step !== 'done' && (
                        <Link to="/login" className="text-surface-400 dark:text-surface-500 hover:text-brand-500 transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                    )}
                    <div>
                        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">
                            {step === 'done' ? 'All Done!' : 'Forgot Password'}
                        </h2>
                        <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
                            {step === 'email' && 'Enter your email to receive an OTP'}
                            {step === 'otp' && `OTP sent to ${email}`}
                            {step === 'password' && 'Choose a strong new password'}
                            {step === 'done' && 'Your password has been reset'}
                        </p>
                    </div>
                </div>

                {/* Step Indicators */}
                {step !== 'done' && (
                    <div className="flex items-center mb-8 gap-2">
                        {['Email', 'OTP', 'New Password'].map((label, i) => (
                            <React.Fragment key={label}>
                                <div className="flex flex-col items-center gap-1">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < stepIndex ? 'bg-brand-500 text-white shadow-glow' :
                                        i === stepIndex ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border-2 border-brand-500' :
                                            'bg-surface-100 dark:bg-surface-700 text-surface-400 dark:text-surface-500'
                                        }`}>
                                        {i < stepIndex ? '✓' : i + 1}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${i === stepIndex ? 'text-brand-600 dark:text-brand-400' : 'text-surface-400 dark:text-surface-500'}`}>{label}</span>
                                </div>
                                {i < 2 && <div className={`flex-1 h-0.5 mb-5 ${i < stepIndex ? 'bg-brand-500' : 'bg-surface-200 dark:bg-surface-700'}`} />}
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3 rounded-xl mb-4 text-sm font-medium">
                        {error}
                    </div>
                )}

                {/* Step 1: Email */}
                {step === 'email' && (
                    <form onSubmit={handleSendOTP} className="space-y-4">
                        <div>
                            <label className="label">Email Address</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input pl-10"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3 text-sm"
                        >
                            {loading ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                    </form>
                )}

                {/* Step 2: OTP */}
                {step === 'otp' && (
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                        <div className="bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 p-3 rounded-xl text-sm text-center border border-brand-100 dark:border-brand-800/50">
                            📧 Check your inbox for a 6-digit OTP. It expires in 10 minutes.
                        </div>
                        <div>
                            <label className="label">Enter OTP</label>
                            <div className="relative">
                                <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="input pl-10 tracking-widest text-center text-xl font-bold"
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading || otp.length !== 6}
                            className="btn-primary w-full py-3 text-sm"
                        >
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                            className="w-full text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium transition-colors"
                        >
                            Didn't receive it? Go back and resend
                        </button>
                    </form>
                )}

                {/* Step 3: New Password */}
                {step === 'password' && (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        {successMsg && (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-3 rounded-xl text-sm font-medium">
                                ✅ {successMsg}
                            </div>
                        )}
                        <div>
                            <label className="label">New Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                                <div className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center gap-2">
                                    <button type="button" onClick={() => setShowPassword(v => !v)} className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 focus:outline-none">
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="input pl-10 pr-10"
                                    placeholder="Min. 6 characters"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="label">Confirm Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="input pl-10"
                                    placeholder="Re-enter password"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3 text-sm mt-2"
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                {/* Step 4: Done */}
                {step === 'done' && (
                    <div className="text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center border border-green-100 dark:border-green-800/50 shadow-inner-glow">
                                <CheckCircle size={40} className="text-green-500" />
                            </div>
                        </div>
                        <p className="text-surface-600 dark:text-surface-300 text-sm">
                            Your password has been reset successfully. You can now log in with your new password.
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            className="btn-primary w-full py-3 font-bold"
                        >
                            Go to Login
                        </button>
                    </div>
                )}

                {/* Bottom link (only on email step) */}
                {step === 'email' && (
                    <p className="mt-8 text-center text-sm text-surface-500 dark:text-surface-400">
                        Remembered it? <Link to="/login" className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-bold transition-colors">Back to Login</Link>
                    </p>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
