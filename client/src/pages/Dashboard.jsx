import React from 'react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const { user, logout } = useAuth();

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
            <p>Welcome, {user?.name}</p>
            <p className="text-sm text-gray-500 mb-4">Role: {user?.role}</p>
            <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
        </div>
    );
};

export default Dashboard;
