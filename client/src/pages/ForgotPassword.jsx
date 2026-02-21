import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, Lock, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

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

    const API = 'http://localhost:5000/api/auth';

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
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
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
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
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
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
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
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    {step !== 'done' && (
                        <Link to="/login" className="text-gray-400 hover:text-indigo-500 transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                    )}
                    <div>
                        <h2 className="text-2xl font-bold text-indigo-600">
                            {step === 'done' ? 'All Done!' : 'Forgot Password'}
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">
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
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < stepIndex ? 'bg-indigo-600 text-white' :
                                            i === stepIndex ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-600' :
                                                'bg-gray-100 text-gray-400'
                                        }`}>
                                        {i < stepIndex ? '✓' : i + 1}
                                    </div>
                                    <span className={`text-xs font-medium ${i === stepIndex ? 'text-indigo-600' : 'text-gray-400'}`}>{label}</span>
                                </div>
                                {i < 2 && <div className={`flex-1 h-0.5 mb-4 ${i < stepIndex ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                {/* Step 1: Email */}
                {step === 'email' && (
                    <form onSubmit={handleSendOTP} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                        >
                            {loading ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                    </form>
                )}

                {/* Step 2: OTP */}
                {step === 'otp' && (
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                        <div className="bg-indigo-50 text-indigo-700 p-3 rounded-lg text-sm text-center">
                            📧 Check your inbox for a 6-digit OTP. It expires in 10 minutes.
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                            <div className="relative">
                                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none tracking-widest text-center text-xl font-bold"
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading || otp.length !== 6}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                        >
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                            className="w-full text-sm text-gray-500 hover:text-indigo-600 transition-colors"
                        >
                            Didn't receive it? Go back and resend
                        </button>
                    </form>
                )}

                {/* Step 3: New Password */}
                {step === 'password' && (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        {successMsg && (
                            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">
                                ✅ {successMsg}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="Min. 6 characters"
                                    required
                                />
                                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="Re-enter password"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                {/* Step 4: Done */}
                {step === 'done' && (
                    <div className="text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle size={40} className="text-green-600" />
                            </div>
                        </div>
                        <p className="text-gray-600 text-sm">
                            Your password has been reset successfully. You can now log in with your new password.
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                        >
                            Go to Login
                        </button>
                    </div>
                )}

                {/* Bottom link (only on email step) */}
                {step === 'email' && (
                    <p className="mt-6 text-center text-sm text-gray-600">
                        Remembered it? <Link to="/login" className="text-indigo-600 hover:underline font-medium">Back to Login</Link>
                    </p>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
