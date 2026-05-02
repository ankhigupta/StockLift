const admin = require("firebase-admin");

let firebaseApp = null;

const initFirebase = async () => {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log("Firebase: FIREBASE_SERVICE_ACCOUNT not set, skipping init");
      return;
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase FCM configured for project:", serviceAccount.project_id);
  } catch (err) {
    console.error("Firebase init error:", err.message);
  }
};

// Send to a single device
const sendNotification = async (fcmToken, title, body, data = {}) => {
  if (!firebaseApp || !fcmToken) {
    console.log(`[FCM] Skipped (no app or token): ${title} - ${body}`);
    return;
  }

  try {
    const message = {
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: "high",
        notification: { sound: "default", channelId: "stocklift_default" },
      },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`[FCM] Sent to ${fcmToken.slice(0, 10)}...: ${title}`);
    return response;
  } catch (err) {
    // Token might be expired/invalid — don't crash
    console.error(`[FCM] Send error: ${err.message}`);
  }
};

// Send to multiple devices
const sendMulticastNotification = async (fcmTokens, title, body, data = {}) => {
  if (!firebaseApp || !fcmTokens || fcmTokens.length === 0) {
    console.log(`[FCM] Skipped multicast (no app or tokens): ${title}`);
    return;
  }

  // Filter out null/empty tokens
  const validTokens = fcmTokens.filter(Boolean);
  if (validTokens.length === 0) return;

  try {
    const message = {
      tokens: validTokens,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: "high",
        notification: { sound: "default", channelId: "stocklift_default" },
      },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`[FCM] Multicast: ${response.successCount}/${validTokens.length} sent: ${title}`);
    return response;
  } catch (err) {
    console.error(`[FCM] Multicast error: ${err.message}`);
  }
};

module.exports = { initFirebase, sendNotification, sendMulticastNotification };