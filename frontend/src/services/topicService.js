import api from "./api";

const getTopicTree = async () => {
    const res = await api.get('/topics/tree');
    return res.data.tree;
};

const getTopicById = async (id) => {
    const res = await api.get(`/topics/${id}`);
    return res.data;
};

const getTopicSubtree = async (id) => {
    const res = await api.get(`/topics/tree/${id}`);
    return res.data.tree;
};

const getTopicUsers = async (id) => {
    const res = await api.get(`/topics/${id}/users`);
    return res.data.users;
};

const getTopicParticipants = async (id) => {
    const res = await api.get(`/topics/${id}/participants`);
    return res.data.users;
};

const blockUserInTopic = async ({ topicId, userId, exceptTopicIds = [] }) => {
    const res = await api.post('/topics/block-user', { topicId, userId, exceptTopicIds });
    return res.data;
};

const unblockUserInTopic = async ({ topicId, userId }) => {
    const res = await api.post('/topics/unblock-user', { topicId, userId });
    return res.data;
};

const createSubtopic = async ({ parentId, name, description, tags }) => {
    const res = await api.post('/topics', { parentId, name, description, tags });
    return res.data;
};

const createTopic = async ({ name, tags }) => {
    const res = await api.post('/topics', { name, tags });
    return res.data;
};

const updateTopic = async (topicId, data) => {
    const res = await api.put(`/topics/${topicId}`, data);
    return res.data;
};

const promoteModerator = async (topicId, userId) => {
    const res = await api.post('/topics/promote-moderator', { topicId, userId });
    return res.data;
};

const removeModerator = async (topicId, userId) => {
    const res = await api.post('/topics/remove-moderator', { topicId, userId });
    return res.data;
};

const listTopics = async ({ parentId, page, limit } = {}) => {
    const params = {};
    if (parentId) params.parentId = parentId;
    if (page) params.page = page;
    if (limit) params.limit = limit;

    const res = await api.get('/topics', { params });
    return res.data;
};

export { listTopics, getTopicById, getTopicTree, getTopicSubtree, getTopicUsers, getTopicParticipants, blockUserInTopic, unblockUserInTopic, createSubtopic, createTopic, updateTopic, promoteModerator, removeModerator };