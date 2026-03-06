import React from 'react';

const SplashScreen = ({ fadeOut }) => {
    return (
        <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-brand-600 transition-opacity duration-500 ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex flex-col items-center animate-bounce-subtle">
                <div className="bg-white p-4 rounded-3xl shadow-2xl mb-6">
                    <img
                        src="/logo.png"
                        alt="KiddoTrack Logo"
                        className="w-24 h-18 object-contain"
                    />
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter">
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
