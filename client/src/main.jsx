import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import { initNotificationSounds } from './utils/notificationSound';

// Unlock Web Audio on first user interaction (browser requirement)
initNotificationSounds();

const GOOGLE_CLIENT_ID = "738293431490-qvm04rag2fh24sh6aibnt8eod7o9i7jo.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{
              className: '!bg-white dark:!bg-surface-800 !text-surface-900 dark:!text-surface-100 !shadow-glass !rounded-xl !font-sans',
              duration: 4000,
            }}
          />
          <App />
        </AuthProvider>
      </GoogleOAuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
