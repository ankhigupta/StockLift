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

// Send to a single device using Expo Push API
const sendNotification = async (pushToken, title, body, data = {}) => {
  if (!pushToken) return;
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        data,
        sound: "default",
        priority: "high",
      }),
    });
    const result = await response.json();
    console.log(`[EXPO PUSH] Sent: ${title} → ${result.data?.status}`);
  } catch (err) {
    console.error(`[EXPO PUSH] Error: ${err.message}`);
  }
};

// Send to multiple devices using Expo Push API
const sendMulticastNotification = async (pushTokens, title, body, data = {}) => {
  if (!pushTokens || pushTokens.length === 0) return;
  const validTokens = pushTokens.filter(Boolean);
  if (validTokens.length === 0) return;
  try {
    const messages = validTokens.map(token => ({
      to: token,
      title,
      body,
      data,
      sound: "default",
      priority: "high",
    }));
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
    const result = await response.json();
    console.log(`[EXPO PUSH] Multicast sent: ${title}`);
  } catch (err) {
    console.error(`[EXPO PUSH] Multicast error: ${err.message}`);
  }
};

module.exports = { initFirebase, sendNotification, sendMulticastNotification };