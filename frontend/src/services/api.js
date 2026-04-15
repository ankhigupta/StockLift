import axios from "axios";
import * as SecureStore from "expo-secure-store";

const api = axios.create({
  baseURL: "http://10.20.16.207:8000/api/v1",
});

api.interceptors.request.use(async (config) => {

  const token = await SecureStore.getItemAsync("accesstoken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    return Promise.reject(error);
  }
);

export default api;