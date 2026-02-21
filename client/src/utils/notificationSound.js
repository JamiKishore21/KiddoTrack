/**
 * Notification Sound System for KiddoTrack
 * Works on both Desktop and Mobile browsers (iOS Safari, Android Chrome, etc.)
 * Uses Web Audio API + Vibration API fallback for mobile devices.
 */

import toast from 'react-hot-toast';

let audioContext = null;
let isAudioUnlocked = false;

// ─── Audio Context Management ────────────────────────────────────────

function getAudioContext() {
    if (!audioContext || audioContext.state === 'closed') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            console.warn('Web Audio API not supported');
            return null;
        }
        audioContext = new AudioCtx();
    }
    return audioContext;
}

/**
 * Resume AudioContext — required on mobile after user gesture.
 * iOS Safari is especially strict about this.
 */
async function ensureAudioReady() {
    const ctx = getAudioContext();
    if (!ctx) return null;

    // iOS Safari suspends AudioContext aggressively
    if (ctx.state === 'suspended') {
        try {
            await ctx.resume();
        } catch (e) {
            console.warn('AudioContext resume failed:', e);
        }
    }
    return ctx;
}

// ─── Vibration (Mobile Haptic Feedback) ──────────────────────────────

/**
 * Vibrate the device as haptic feedback (mobile only).
 * Pattern is an array of [vibrate, pause, vibrate, pause, ...] in ms.
 */
function vibrate(pattern) {
    if (navigator.vibrate) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            // Silently fail — vibration is optional
        }
    }
}

const vibrationPatterns = {
    success: [80],
    error: [100, 50, 100],
    warning: [60, 40, 60, 40, 80],
    info: [50],
    urgent: [100, 50, 100, 50, 200],
};

// ─── Tone Generator ─────────────────────────────────────────────────

function playTone(ctx, frequency, startTime, duration, volume = 0.2, waveType = 'sine') {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = waveType;
    oscillator.frequency.setValueAtTime(frequency, startTime);

    // Smooth envelope: quick attack, sustain, smooth decay
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.setValueAtTime(volume, startTime + duration * 0.6);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.05);
}

// ─── Sound Definitions ──────────────────────────────────────────────

const soundDefinitions = {
    // Pleasant double-chime for success
    success: (ctx, now) => {
        playTone(ctx, 880, now, 0.12, 0.3, 'sine');        // A5
        playTone(ctx, 1108.73, now + 0.12, 0.18, 0.25, 'sine'); // C#6
    },
    // Descending two-tone for errors
    error: (ctx, now) => {
        playTone(ctx, 440, now, 0.15, 0.3, 'square');      // A4
        playTone(ctx, 330, now + 0.18, 0.2, 0.25, 'square'); // E4
    },
    // Attention-grabbing rising tone for warnings
    warning: (ctx, now) => {
        playTone(ctx, 587.33, now, 0.1, 0.25, 'triangle');       // D5
        playTone(ctx, 659.25, now + 0.1, 0.1, 0.25, 'triangle'); // E5
        playTone(ctx, 783.99, now + 0.2, 0.15, 0.2, 'triangle'); // G5
    },
    // Single soft ping for info
    info: (ctx, now) => {
        playTone(ctx, 698.46, now, 0.2, 0.2, 'sine'); // F5
    },
    // Urgent repeating alert for bus arriving
    urgent: (ctx, now) => {
        playTone(ctx, 1046.50, now, 0.08, 0.35, 'sine');        // C6
        playTone(ctx, 1318.51, now + 0.1, 0.08, 0.3, 'sine');   // E6
        playTone(ctx, 1567.98, now + 0.2, 0.08, 0.35, 'sine');  // G6
        playTone(ctx, 2093.00, now + 0.3, 0.15, 0.3, 'sine');   // C7
    },
};

// ─── Main Sound Player ──────────────────────────────────────────────

/**
 * Play a notification sound with optional vibration.
 * @param {'success' | 'error' | 'warning' | 'info' | 'urgent'} type
 */
export async function playNotificationSound(type = 'info') {
    // Vibrate on mobile (works even if audio fails)
    vibrate(vibrationPatterns[type] || vibrationPatterns.info);

    try {
        const ctx = await ensureAudioReady();
        if (!ctx) return;

        const now = ctx.currentTime;
        const play = soundDefinitions[type] || soundDefinitions.info;
        play(ctx, now);
    } catch (e) {
        console.warn('Notification sound failed:', e);
    }
}

// ─── Push Notification Support (Mobile) ─────────────────────────────

/**
 * Request permission for browser push notifications.
 * On mobile, this enables system-level notifications even when the tab is in background.
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';

    try {
        const result = await Notification.requestPermission();
        return result;
    } catch (e) {
        return 'error';
    }
}

/**
 * Show a system-level push notification (works on mobile even in background).
 * Falls back to regular toast if not supported/permitted.
 */
export function showSystemNotification(title, body, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            const notification = new Notification(title, {
                body,
                icon: '/vite.svg',
                badge: '/vite.svg',
                vibrate: vibrationPatterns[options.type || 'info'],
                tag: options.tag || 'kiddotrack',
                renotify: true,
                requireInteraction: options.urgent || false,
                ...options,
            });

            // Auto-close after duration
            if (options.autoClose !== false) {
                setTimeout(() => notification.close(), options.duration || 10000);
            }

            return notification;
        } catch (e) {
            // Service worker based Notification fails without SW, fall back silently
            console.warn('System notification failed:', e);
        }
    }
    return null;
}

// ─── Notify Wrapper (Toast + Sound + Vibration + System Notification) ─

export const notify = {
    success: (message, options = {}) => {
        playNotificationSound('success');
        return toast.success(message, options);
    },

    error: (message, options = {}) => {
        playNotificationSound('error');
        return toast.error(message, options);
    },

    warning: (message, options = {}) => {
        playNotificationSound('warning');
        return toast(message, {
            icon: '⚠️',
            ...options,
        });
    },

    info: (message, options = {}) => {
        playNotificationSound('info');
        return toast(message, {
            icon: 'ℹ️',
            ...options,
        });
    },

    /**
     * Bus ETA alert with escalating urgency.
     * Plays sound + vibration + optional system notification for background awareness.
     */
    busAlert: (message, etaMinutes, options = {}) => {
        const baseStyle = {
            duration: 30000,
            style: { borderRadius: '12px' },
        };

        let soundType, icon;
        if (etaMinutes <= 1) {
            soundType = 'urgent';
            icon = '🛑';
        } else if (etaMinutes <= 5) {
            soundType = 'warning';
            icon = '⏰';
        } else {
            soundType = 'info';
            icon = '🚍';
        }

        playNotificationSound(soundType);

        // Also show system notification (visible even if app is in background on mobile)
        if (document.hidden || etaMinutes <= 5) {
            showSystemNotification('KiddoTrack', message, {
                type: soundType,
                urgent: etaMinutes <= 1,
                tag: `eta-${etaMinutes}`,
            });
        }

        return toast(message, {
            ...baseStyle,
            icon,
            ...options,
        });
    },

    /**
     * Raw toast with custom sound type
     */
    custom: (message, soundType = 'info', options = {}) => {
        playNotificationSound(soundType);
        return toast(message, options);
    },
};

// ─── Initialization ─────────────────────────────────────────────────

/**
 * Initialize the notification sound system.
 * - Unlocks Web Audio on first user interaction (required by iOS Safari & Android Chrome)
 * - Requests push notification permission
 * Call this once in your app root (main.jsx).
 */
export function initNotificationSounds() {
    const unlock = () => {
        // Create and unlock AudioContext
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().then(() => {
                isAudioUnlocked = true;
            });
        } else {
            isAudioUnlocked = true;
        }

        // Play a silent "warmup" tone — fixes iOS Safari first-play delay
        if (ctx) {
            try {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0, ctx.currentTime); // Silent
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.01);
            } catch (e) {
                // Ignore
            }
        }

        // Clean up listeners
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('touchend', unlock);
        document.removeEventListener('keydown', unlock);
    };

    // Listen for multiple gesture types (covers desktop + mobile)
    document.addEventListener('click', unlock, { once: false, passive: true });
    document.addEventListener('touchstart', unlock, { once: false, passive: true });
    document.addEventListener('touchend', unlock, { once: false, passive: true });
    document.addEventListener('keydown', unlock, { once: false, passive: true });

    // Request notification permission after a brief delay (better UX than immediately)
    setTimeout(() => {
        requestNotificationPermission();
    }, 5000);
}
