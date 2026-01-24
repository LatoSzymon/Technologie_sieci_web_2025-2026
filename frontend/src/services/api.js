import axios from "axios";

const urlData = {
    port: import.meta.env.VITE_API_PORT || 3443,
    host: import.meta.env.VITE_API_HOST || 'localhost'
}

const api = axios.create({
    baseURL: `https://${urlData.host}:${urlData.port}/api`,
    withCredentials: true
});

export default api;