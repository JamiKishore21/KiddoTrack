import React from 'react';

const SplashScreen = ({ fadeOut }) => {
    return (
        <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-brand-600 transition-all duration-700 ${fadeOut ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'}`}>
            <div className="flex flex-col items-center animate-in zoom-in duration-500">
                <div className="bg-white p-6 rounded-[2.5rem] shadow-glow-lg mb-8 transform hover:scale-105 transition-transform">
                    <img
                        src="/logo.png"
                        alt="KiddoTrack Logo"
                        className="w-28 h-20 object-contain"
                    />
                </div>
                <h1 className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">
                    KiddoTrack
                </h1>
                <div className="mt-4 flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse [animation-delay:200ms]" />
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse [animation-delay:400ms]" />
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
