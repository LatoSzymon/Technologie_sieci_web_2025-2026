import api from './api';

const listUnapprovedUsers = async () => {
  const res = await api.get('/admin/unapproved-users');
  return res.data.users;
};

const approveUser = async (userId) => {
  const res = await api.post(`/admin/users/${userId}/approve`);
  return res.data;
};

const blockUser = async (userId) => {
  const res = await api.post(`/admin/users/${userId}/block`);
  return res.data;
};

const unblockUser = async (userId) => {
  const res = await api.post(`/admin/users/${userId}/unblock`);
  return res.data;
};

export { listUnapprovedUsers, approveUser, blockUser, unblockUser };
