import api from './api';

const listUnapprovedUsers = async () => {
  const res = await api.get('/admin/unapproved-users');
  return res.data.users;
};

const listBlockedUsers = async () => {
  const res = await api.get('/admin/blocked-users');
  return res.data.users;
};

const listAllNonAdminUsers = async () => {
  const res = await api.get('/admin/all-users');
  return res.data.users;
};

const getStatistics = async () => {
  const res = await api.get('/admin/statistics');
  return res.data;
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

const deleteUser = async (userId) => {
  const res = await api.post(`/admin/users/delete`, { userId });
  return res.data;
};

const closeTopic = async (topicId) => {
  const res = await api.post('/admin/topics/close', { topicId });
  return res.data;
};

const openTopic = async (topicId) => {
  const res = await api.post('/admin/topics/open', { topicId });
  return res.data;
};

const hideTopic = async (topicId) => {
  const res = await api.post('/admin/topics/hide', { topicId });
  return res.data;
};

const unhideTopic = async (topicId) => {
  const res = await api.post('/admin/topics/unhide', { topicId });
  return res.data;
};

export { 
  listUnapprovedUsers, 
  listBlockedUsers, 
  listAllNonAdminUsers, 
  getStatistics,
  approveUser, 
  blockUser, 
  unblockUser, 
  deleteUser,
  closeTopic, 
  openTopic, 
  hideTopic, 
  unhideTopic 
};
