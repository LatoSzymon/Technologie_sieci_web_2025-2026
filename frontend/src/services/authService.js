import api from "./api";

const login = async (data) => {
    const res = await api.post('/auth/login', data);
    return res.data;
}

const register = async (data) => {
    const res = await api.post('/auth/register', data);
    return res.data;
}

const getMe = async () => {
    const res = await api.get('/auth/me');
    return res.data.user;
}

export {getMe, register, login};