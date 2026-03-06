import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { registerPlugin } from '@capacitor/core';
const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

export const isNative = Capacitor.isNativePlatform();

// --- PUSH NOTIFICATIONS ---
export const setupPushNotifications = async () => {
    if (!isNative) return;

    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
        console.warn('User denied push notification permissions');
        return;
    }

    await PushNotifications.register();

    // On success, we should store this token in the backend linked to the user
    PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token: ' + token.value);
        // TODO: Send token to backend
    });

    PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error: ' + JSON.stringify(error));
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ' + JSON.stringify(notification));
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
    });
};

// --- BACKGROUND GEOLOCATION ---
let watcherId = null;

export const startBackgroundGeolocation = async (callback) => {
    if (!isNative) return null;

    try {
        watcherId = await BackgroundGeolocation.addWatcher(
            {
                backgroundMessage: "KiddoTrack is tracking the bus location.",
                backgroundTitle: "Bus Active",
                requestPermissions: true,
                stale: false,
                distanceFilter: 10 // meters
            },
            (location, error) => {
                if (error) {
                    console.error('BG Location Error:', error);
                    return;
                }
                if (location) {
                    callback({
                        lat: location.latitude,
                        lng: location.longitude,
                        speed: location.speed,
                        heading: location.bearing
                    });
                }
            }
        );
        return watcherId;
    } catch (err) {
        console.error('Failed to start background geolocation:', err);
        return null;
    }
};

export const stopBackgroundGeolocation = async () => {
    if (!isNative || !watcherId) return;
    try {
        await BackgroundGeolocation.removeWatcher({ id: watcherId });
        watcherId = null;
    } catch (err) {
        console.error('Failed to stop background geolocation:', err);
    }
};
