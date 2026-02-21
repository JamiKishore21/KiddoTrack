import React from 'react';
import { Link } from 'react-router-dom';
import { Bus, Shield, MapPin, Zap, ArrowRight } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const Home = () => {
    return (
        <div className="min-h-screen-safe relative overflow-hidden
            bg-gradient-to-br from-surface-50 via-white to-orange-50
            dark:from-surface-950 dark:via-surface-900 dark:to-surface-950">

            {/* Floating decorative orbs */}
            <div className="absolute top-20 -left-20 w-72 h-72 bg-brand-400/15 dark:bg-brand-500/8 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 -right-20 w-96 h-96 bg-amber-400/15 dark:bg-amber-600/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-300/8 dark:bg-brand-500/3 rounded-full blur-3xl" />

            {/* Theme Toggle */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
                <ThemeToggle />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen-safe px-6 py-16">

                {/* Logo */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-brand-500/20 dark:bg-brand-400/15 rounded-3xl blur-xl scale-150" />
                    <div className="relative bg-gradient-to-br from-brand-500 to-brand-700 dark:from-brand-400 dark:to-brand-600 p-5 rounded-3xl shadow-glow">
                        <Bus size={36} className="text-white" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold mb-4 text-center tracking-tight">
                    <span className="text-gradient">Kiddo</span>
                    <span className="text-surface-900 dark:text-white">Track</span>
                </h1>

                <p className="text-lg sm:text-xl text-surface-500 dark:text-surface-400 text-center max-w-md mb-2 font-medium">
                    Safe, Real-time School Bus Tracking
                </p>
                <p className="text-sm text-surface-400 dark:text-surface-500 text-center max-w-sm mb-10 leading-relaxed">
                    Know exactly where your child's bus is, every moment of every trip.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-md">
                    <Link to="/login" className="btn-primary flex-1 text-center flex items-center justify-center gap-2 text-base">
                        Log In <ArrowRight size={18} />
                    </Link>
                    <Link to="/register" className="btn-secondary flex-1 text-center text-base">
                        Create Account
                    </Link>
                </div>

                {/* Features */}
                <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-lg sm:max-w-2xl">
                    {[
                        { icon: MapPin, label: 'Live GPS Tracking', color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
                        { icon: Shield, label: 'Safe & Secure', color: 'text-brand-500 dark:text-brand-400', bg: 'bg-brand-100 dark:bg-brand-900/30' },
                        { icon: Zap, label: 'Instant ETA Alerts', color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
                    ].map((feature, i) => (
                        <div key={i} className="glass-card flex items-center gap-3 px-4 py-3.5 sm:flex-col sm:items-center sm:py-6 sm:text-center">
                            <div className={`${feature.bg} p-2.5 rounded-xl`}>
                                <feature.icon size={20} className={feature.color} />
                            </div>
                            <span className="text-sm font-medium text-surface-600 dark:text-surface-400">{feature.label}</span>
                        </div>
                    ))}
                </div>

                {/* Trust indicators */}
                <div className="mt-10 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-xs text-surface-400 dark:text-surface-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                        Secure encrypted tracking
                    </div>
                    <div className="flex items-center gap-2 text-xs text-surface-400 dark:text-surface-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                        Real-time location updates
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
