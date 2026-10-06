import axios from "axios";

export const API = import.meta.env.VITE_API_URL;
export const registerUser = (data) => axios.post(`${API}/user/create`, data);
export const signupInit = (data) => axios.post(`${API}/user/signup/init`, data);
export const signupVerify = (data) => axios.post(`${API}/user/signup/verify`, data);
export const loginUser = (data) => axios.post(`${API}/user/login`, data);
export const verify2FALogin = (data) => axios.post(`${API}/user/login/2fa-verify`, data);
export const toggle2FA = (enable, userId) => axios.post(`${API}/user/2fa/toggle?enable=${enable}`, {}, { headers: { "User-Id": userId } });
export const registerFCMToken = (data) => axios.post(`${API}/fcm/register`, data);
export const removeFCMToken = (deviceId) => axios.post(`${API}/fcm/remove`, { deviceId });
