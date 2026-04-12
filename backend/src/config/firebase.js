const https = require("https");

let firebaseProjectId = null;
let accessToken = null;

const initFirebase = async () => {
  try {
    firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
    console.log("Firebase FCM configured for project:", firebaseProjectId);
  } catch (err) {
    console.error("Firebase init error:", err.message);
  }
};

const sendNotification = async (fcmToken, title, body, data = {}) => {
  // Will be implemented with Razorpay later
  // For now just log
  console.log(`[FCM] Would send to ${fcmToken}: ${title} - ${body}`);
};

const sendMulticastNotification = async (fcmTokens, title, body, data = {}) => {
  console.log(`[FCM] Would send to ${fcmTokens.length} devices: ${title} - ${body}`);
};

module.exports = { initFirebase, sendNotification, sendMulticastNotification };