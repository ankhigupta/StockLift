import api from "./api";
import * as SecureStore from "expo-secure-store";

export const registerUser = async (name, email, password, phone, role) => {
  const response = await api.post("/auth/register", { 
    name, 
    email, 
    password, 
    phone, 
    role });
  await SecureStore.setItemAsync("accessToken", response.data.accessToken);
  await SecureStore.setItemAsync("refreshToken", response.data.refreshToken);
  await SecureStore.setItemAsync("userRole", response.data.user.role);
  return response.data;
};

export const loginUser = async (email, password) => {
  const response = await api.post("/auth/login", { email, password });
  await SecureStore.setItemAsync("accessToken", response.data.accessToken);
  await SecureStore.setItemAsync("refreshToken", response.data.refreshToken);
  const meResponse = await api.get("/auth/me");
  const role = meResponse.data.user?.role;
  await SecureStore.setItemAsync("userRole", role);
  return response.data;
};

export const logoutUser = async () => {
  await SecureStore.deleteItemAsync("accessToken");
  await SecureStore.deleteItemAsync("refreshToken");
  await SecureStore.deleteItemAsync("userRole");
};

export const getMe = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};
