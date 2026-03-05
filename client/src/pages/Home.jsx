import React from 'react';
import { Link } from 'react-router-dom';
import { Bus, Shield, MapPin, Zap, ArrowRight } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const Home = () => {
    return (
        <div className="min-h-screen-safe relative overflow-hidden bg-surface-50 dark:bg-surface-950">

            {/* Simple Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 dark:opacity-10 pointer-events-none" />

            {/* Theme Toggle */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
                <ThemeToggle />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen-safe px-6 py-16">

                {/* Logo */}
                <div className="relative mb-8">
                    <div className="relative bg-brand-600 dark:bg-brand-500 p-5 rounded-3xl shadow-lg shadow-brand-500/20">
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
