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

export {getTopicById, getTopicTree, getTopicSubtree};