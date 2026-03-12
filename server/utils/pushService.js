const admin = require('firebase-admin');
const User = require('../models/User');

// Initialize Firebase Admin
// In production, we will use environment variables for this.
// For now, we initialize it safely if the service account is provided.
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('[FIREBASE] Admin initialized');
    } catch (err) {
        console.error('[FIREBASE] Initialization error:', err.message);
    }
} else {
    console.warn('[FIREBASE] No service account found. Push notifications will be logged but not sent.');
}

/**
 * Sends a push notification to all parents linked to a specific bus.
 */
const sendPushToBusParents = async (busId, title, body) => {
    try {
        // 1. Find all parents (and students) linked to this bus who have a token
        // Optimization: In a real app, users would be explicitly linked to buses.
        // For now, we look for users with the 'parent' or 'student' role.
        // Note: For a more targeted approach, you'd filter by assignedBus if implemented for parents.
        const users = await User.find({
            role: { $in: ['parent', 'student'] },
            fcmToken: { $exists: true, $ne: null }
        });

        const tokens = users.map(u => u.fcmToken);

        if (tokens.length === 0) {
            console.log(`[PUSH] No tokens found for parents on bus ${busId}`);
            return;
        }

        const message = {
            notification: { title, body },
            tokens: tokens, // Multicast
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'kiddotrack_messages',
                    priority: 'high',
                    defaultSound: true,
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                        contentAvailable: true,
                    }
                }
            },
            data: { busId: busId.toString() }
        };

        if (admin.apps.length > 0) {
            const response = await admin.messaging().sendEachForMulticast(message);
            // console.log(`[PUSH] Successfully sent to ${response.successCount} devices`);

            // Handle failed tokens (e.g., expired)
            if (response.failureCount > 0) {
                const failedTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        failedTokens.push(tokens[idx]);
                    }
                });
                console.warn(`[PUSH] Failed for tokens: ${failedTokens.length}`);
                // Optional: Remove invalid tokens from DB
            }
        } else {
            // console.log(`[PUSH-SIM] Would send to ${tokens.length} devices: "${title}: ${body}"`);
        }
    } catch (err) {
        console.error('[PUSH ERROR] Failed to broadcast:', err.message);
    }
};

/**
 * Sends a push notification to the driver assigned to a specific bus.
 * Used when a parent sends a chat message so the driver gets a WhatsApp-style alert.
 */
const sendPushToDriver = async (busId, title, body) => {
    try {
        const Bus = require('../models/Bus');
        const bus = await Bus.findOne({ busNumber: busId }).populate('assignedDriver');
        
        // Find the driver user — look by assignedBus field on the User model
        const driver = await User.findOne({
            role: 'driver',
            assignedBus: bus?._id,
            fcmToken: { $exists: true, $ne: null }
        });

        if (!driver?.fcmToken) {
            console.log(`[PUSH] No FCM token for driver on bus ${busId}`);
            return;
        }

        const message = {
            notification: { title, body },
            token: driver.fcmToken,
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'kiddotrack_messages',
                    priority: 'high',
                    defaultSound: true,
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                        contentAvailable: true,
                    }
                }
            },
            data: { busId: busId.toString(), type: 'parent_message' }
        };

        if (admin.apps.length > 0) {
            await admin.messaging().send(message);
            // console.log(`[PUSH] Driver on bus ${busId} notified: "${title}"`);
        } else {
            // console.log(`[PUSH-SIM] Would notify driver on bus ${busId}: "${title}: ${body}"`);
        }
    } catch (err) {
        console.error('[PUSH ERROR] Failed to notify driver:', err.message);
    }
};

module.exports = { sendPushToBusParents, sendPushToDriver };
