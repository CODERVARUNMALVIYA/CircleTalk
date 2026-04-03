import axios from "axios";

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '');

export const axiosInstance = axios.create({
    baseURL: `${API_BASE_URL}/api`, 
    withCredentials: true,
});