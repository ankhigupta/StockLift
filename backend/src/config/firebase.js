const initFirebase = async () => {
  try {
    console.log("Firebase FCM configured for project:", process.env.FIREBASE_PROJECT_ID);
  } catch (err) {
    console.error("Firebase init error:", err.message);
  }
};

const sendNotification = async (fcmToken, title, body, data = {}) => {
  console.log(`[FCM] Would send to ${fcmToken?.slice(0, 10)}...: ${title} - ${body}`);
};

const sendMulticastNotification = async (fcmTokens, title, body, data = {}) => {
  console.log(`[FCM] Would send to ${fcmTokens?.length} devices: ${title} - ${body}`);
};

module.exports = { initFirebase, sendNotification, sendMulticastNotification };