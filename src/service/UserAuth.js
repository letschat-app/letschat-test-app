import axios from "axios";

export const API = import.meta.env.VITE_API_URL;

// User Registration & Authentication
export const registerUser = (data) => axios.post(`${API}/user/create`, data);
export const signupInit = (data) => axios.post(`${API}/user/signup/init`, data);
export const signupVerify = (data) => axios.post(`${API}/user/signup/verify`, data);
export const loginUser = (data) => axios.post(`${API}/user/login`, data);
export const verify2FALogin = (data) => axios.post(`${API}/user/login/2fa-verify`, data);

// Forgot Password Flow
export const forgotPasswordSendOtp = (identifier) =>
  axios.post(`${API}/user/forgot-password/send-otp?identifier=${encodeURIComponent(identifier)}`);
export const forgotPasswordVerifyOtp = (data) =>
  axios.post(`${API}/user/forgot-password/verify-otp`, data);
export const forgotPasswordReset = (data) =>
  axios.post(`${API}/user/forgot-password/reset`, data);

// Authenticated Password Change (with optional 2FA OTP)
export const changePassword = (data, userId) =>
  axios.post(`${API}/user/change-password`, data, {
    headers: { "User-Id": userId, "Content-Type": "application/json" },
  });
export const changePasswordSendOtp = (userId) =>
  axios.post(`${API}/user/change-password/send-otp`, {}, {
    headers: { "User-Id": userId },
  });

// 2FA Management with OTP Challenge
export const send2FAOtp = (enable, userId) =>
  axios.post(`${API}/user/2fa/send-otp?enable=${enable}`, {}, {
    headers: { "User-Id": userId },
  });
export const verifyAndToggle2FA = (data, userId) =>
  axios.post(`${API}/user/2fa/verify-and-toggle`, data, {
    headers: { "User-Id": userId, "Content-Type": "application/json" },
  });
export const toggle2FA = (enable, userId) =>
  axios.post(`${API}/user/2fa/toggle?enable=${enable}`, {}, {
    headers: { "User-Id": userId },
  });

// Virtual Room APIs
export const checkRoomName = (roomName) =>
  axios.get(`${API}/room/check-name?roomName=${encodeURIComponent(roomName)}`);
export const createRoom = (data) =>
  axios.post(`${API}/room/create`, data);

// Push Notifications (FCM)
export const registerFCMToken = (data) => axios.post(`${API}/fcm/register`, data);
export const removeFCMToken = (deviceId) => axios.post(`${API}/fcm/remove`, { deviceId });
