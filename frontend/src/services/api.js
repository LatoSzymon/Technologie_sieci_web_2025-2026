import axios from "axios";

const resolveHost = () => import.meta.env.VITE_API_HOST || window.location.hostname;
const resolvePort = () => import.meta.env.VITE_API_PORT || 3443;
const resolveProtocol = () => (import.meta.env.VITE_API_PROTOCOL || window.location.protocol).replace(':', '');

const urlData = {
    port: resolvePort(),
    host: resolveHost(),
    protocol: resolveProtocol()
}

const api = axios.create({
    baseURL: `${urlData.protocol}://${urlData.host}:${urlData.port}/api`,
    withCredentials: true
});

export default api;