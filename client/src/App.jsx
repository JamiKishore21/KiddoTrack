import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import DriverDashboard from './pages/DriverDashboard';
import ParentDashboard from './pages/ParentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { useAuth } from './context/AuthContext';
import { setupPushNotifications } from './utils/nativeService';
import { useEffect, useState } from 'react';
import SplashScreen from './components/SplashScreen';

const DashboardRouter = () => {
  const { user } = useAuth();

  useEffect(() => {
    setupPushNotifications();
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/splash-screen').then(({ SplashScreen }) => {
        SplashScreen.hide();
      });
    }
  }, []);

  if (!user) return <Navigate to="/login" />;

  switch (user.role) {
    case 'driver':
      return <DriverDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'parent':
      return <ParentDashboard />;
    default:
      return (
        <div className="p-10 text-center">
          <h2 className="text-xl font-bold text-red-500">Role Error</h2>
          <p>Unknown User Role: <strong>{user.role}</strong></p>
          <p>Please contact support or try logging out.</p>
        </div>
      );
  }
};

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setShowSplash(false), 500); // Wait for fade animation
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showSplash && <SplashScreen fadeOut={fadeOut} />}
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <DashboardRouter />
            </PrivateRoute>
          } />
        </Routes>
      </Router>
    </>
  );
}

export default App;
