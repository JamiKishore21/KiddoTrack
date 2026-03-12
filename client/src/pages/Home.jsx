import React from 'react';
import { Link } from 'react-router-dom';
import { Bus, Shield, MapPin, Zap, ArrowRight, Smartphone } from 'lucide-react';
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
            <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 py-16 animate-fade-in">

                {/* Logo */}
                <div className="relative mb-8 group cursor-default">
                    <div className="absolute inset-0 bg-brand-500/30 dark:bg-brand-500/20 rounded-full blur-2xl group-hover:bg-brand-500/50 transition-all duration-500"></div>
                    <div className="relative bg-white dark:bg-surface-800 p-5 rounded-[2rem] shadow-glass border border-surface-200 dark:border-surface-700/50 animate-[float_4s_ease-in-out_infinite]">
                        <img src="/logo.png" alt="KiddoTrack" className="w-20 h-20 object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-500" />
                    </div>
                </div>

                {/* Title */}
                <div className="animate-slide-down">
                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold mb-4 text-center tracking-tight">
                        <span className="text-gradient">Kiddo</span>
                        <span className="text-surface-900 dark:text-white">Track</span>
                    </h1>
                </div>

                <div className="animate-slide-up text-center mb-10">
                    <p className="text-lg sm:text-xl text-surface-500 dark:text-surface-400 max-w-md mb-2 font-medium">
                        Safe, Real-time School Bus Tracking
                    </p>
                    <p className="text-sm text-surface-400 dark:text-surface-500 max-w-sm mx-auto leading-relaxed">
                        Know exactly where your child's bus is, every moment of every trip.
                    </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-md animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                    <Link to="/login" className="btn-primary flex-1 text-center flex items-center justify-center gap-2 text-base hover:scale-[1.02] transition-transform">
                        Log In <ArrowRight size={18} />
                    </Link>
                    <Link to="/register" className="btn-secondary flex-1 text-center text-base hover:scale-[1.02] transition-transform">
                        Create Account
                    </Link>
                </div>

                {/* Features */}
                <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 w-full max-w-lg sm:max-w-4xl animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
                    {[
                        { icon: MapPin, label: 'Live GPS Tracking', desc: 'Real-time location updates directly to your phone', color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
                        { icon: Shield, label: 'Safe & Secure', desc: 'Encrypted communication and verified drivers', color: 'text-brand-500 dark:text-brand-400', bg: 'bg-brand-100 dark:bg-brand-900/30' },
                        { icon: Zap, label: 'Instant ETA Alerts', desc: 'Get notified when the bus is approaching', color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
                    ].map((feature, i) => (
                        <div key={i} className="glass-card group hover:-translate-y-2 hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-300 flex items-center gap-4 px-5 py-4 sm:flex-col sm:items-center sm:py-8 sm:px-6 sm:text-center cursor-default">
                            <div className={`${feature.bg} p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                                <feature.icon size={24} className={feature.color} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-surface-900 dark:text-white mb-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{feature.label}</h3>
                                <p className="text-xs text-surface-500 dark:text-surface-400 leading-relaxed max-w-[200px] hidden sm:block mx-auto">{feature.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Trust indicators */}
                <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 animate-slide-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                    <div className="flex items-center gap-2 text-xs font-semibold text-surface-500 dark:text-surface-400 bg-surface-100 dark:bg-surface-900 px-3 py-1.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Live tracking active
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-surface-500 dark:text-surface-400 bg-surface-100 dark:bg-surface-900 px-3 py-1.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-brand-500" />
                        Secure encrypted tracking
                    </div>
                </div>
            </div>

            {/* How It Works Section */}
            <div className="relative z-10 bg-white dark:bg-surface-900 border-y border-surface-200 dark:border-surface-800 py-16 sm:py-24 px-6 w-full animate-slide-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12 sm:mb-16">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-surface-900 dark:text-white mb-4">How It Works</h2>
                        <p className="text-surface-500 dark:text-surface-400 max-w-2xl mx-auto font-medium">Three simple steps to complete peace of mind while your children commute.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-[45px] left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-brand-100 via-brand-500 to-brand-100 dark:from-brand-900/30 dark:via-brand-500/50 dark:to-brand-900/30 -z-10"></div>

                        {[
                            { step: '1', title: 'Route Setup', desc: 'School admins create routes and assign students to specific buses.', icon: MapPin },
                            { step: '2', title: 'Driver App Starts', desc: 'Drivers use the KiddoTrack app to start trips and navigate stops.', icon: Bus },
                            { step: '3', title: 'Parents Track Live', desc: 'Parents receive instant ETA alerts and track the bus locally on the map.', icon: Smartphone }
                        ].map((item, i) => (
                            <div key={i} className="flex flex-col items-center text-center relative z-10">
                                <div className="w-24 h-24 rounded-full bg-surface-50 dark:bg-surface-800 border-4 border-white dark:border-surface-900 shadow-xl flex items-center justify-center mb-6 relative group hover:border-brand-500 transition-colors duration-300">
                                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-brand-500 text-white text-sm font-bold flex items-center justify-center shadow-lg">{item.step}</div>
                                    <item.icon size={36} className="text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform duration-300" />
                                </div>
                                <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">{item.title}</h3>
                                <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed max-w-[250px]">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="relative z-10 bg-surface-50 dark:bg-surface-950 py-8 px-6 border-t border-surface-200 dark:border-surface-800 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="KiddoTrack" className="w-6 h-6 object-contain grayscale opacity-60 dark:opacity-40" />
                        <span className="font-bold text-surface-500 dark:text-surface-400 text-base">KiddoTrack</span>
                    </div>
                    
                    <div className="text-xs font-medium text-surface-400 dark:text-surface-500 text-center">
                        © {new Date().getFullYear()} KiddoTrack. All rights reserved.
                    </div>
                    
                    <div className="flex gap-4 text-xs font-semibold">
                        <span className="text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer transition-colors">Privacy</span>
                        <span className="text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer transition-colors">Terms</span>
                        <span className="text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer transition-colors">Contact</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
