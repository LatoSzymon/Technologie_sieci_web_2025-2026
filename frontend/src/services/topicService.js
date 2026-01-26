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
    const res = await api.get(`/topics/${id}/tree`);
    return res.data.tree;
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

export {getTopicById, getTopicTree, getTopicSubtree, blockUserInTopic, unblockUserInTopic, createSubtopic, createTopic};