import api from './api';

const listAllUsers = async () => {
  const res = await api.get('/admin/all-users');
  return res.data.users;
};

const updateProfile = async (data) => {
  return api.put('/auth/profile', data);
};

const changePassword = async (data) => {
  return api.post('/auth/change-password', data);
};

export { listAllUsers, updateProfile, changePassword };