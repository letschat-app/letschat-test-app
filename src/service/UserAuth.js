import axios from "axios";

export const API = import.meta.env.VITE_API_URL;
export const registerUser = (data) => axios.post(`${API}/user/create`, data);
export const loginUser = (data) => axios.post(`${API}/user/login`, data);
export const registerFCMToken = (data) => axios.post(`${API}/fcm/register`, data);
export const removeFCMToken = (deviceId) => axios.post(`${API}/fcm/remove`, { deviceId });
