import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex flex-col items-center justify-center text-white">
            <h1 className="text-5xl font-bold mb-4">KiddoTrack</h1>
            <p className="text-xl mb-8">Safe, Real-time School Bus Tracking</p>
            <div className="space-x-4">
                <Link to="/login" className="bg-white text-indigo-600 px-6 py-3 rounded-full font-semibold shadow-lg hover:bg-gray-100 transition">Login</Link>
                <Link to="/register" className="bg-transparent border-2 border-white px-6 py-3 rounded-full font-semibold hover:bg-white/10 transition">Sign Up</Link>
            </div>
        </div>
    );
};

export default Home;
