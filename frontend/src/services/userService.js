import api from './api';

const listAllUsers = async () => {
  const res = await api.get('/admin/users');
  return res.data.users;
};

export { listAllUsers };