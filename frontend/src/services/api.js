import { config } from "dotenv";
import axios from "axios";

config();

const urlData = {
    port: process.env.HTTPS_PORT || 3443,
    host: process.env.API_HOST || 'localhost'
}

const api = axios.create({
    baseURL: `https://${urlData.host}:${urlData.port}/api`,
    withCredentials: true
});

export default api;