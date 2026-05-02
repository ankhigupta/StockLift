import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import api from "./src/services/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const registerForPushNotifications = async () => {
  if (!Device.isDevice) return; // won't work on simulator
  
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== "granted") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("stocklift_default", {
      name: "StockLift",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  }

  const token = (await Notifications.getDevicePushTokenAsync()).data;
  
  try {
    await api.post("/auth/fcm-token", { fcm_token: token });
    console.log("FCM token saved:", token?.slice(0, 20));
  } catch (err) {
    console.log("FCM token save error:", err.message);
  }
};

export default function App() {
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}