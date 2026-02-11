import api from "./api";

const fetchPosts = async (topicId, page = 1, limit = 20) => {
    const res = await api.get(`/topics/${topicId}/posts?page=${page}&limit=${limit}`);
    return res.data;
};

const createPost = async (topicId, content, replyTo = null, tags = []) => {
    const res = await api.post('/posts', {
        topicId,
        content,
        replyTo,
        tags
    });
    return res.data;
};

const updatePost = async (postId, content) => {
    const res = await api.put(`/posts/${postId}`, {
        content
    });
    return res.data;
};

const deletePost = async (postId) => {
    const res = await api.delete(`/posts/${postId}`);
    return res.data;
};

const toggleLike = async (postId) => {
    const res = await api.post(`/posts/${postId}/like`);
    return res.data;
};

const getLastReadPage = async (topicId) => {
    const res = await api.get(`/topics/${topicId}/last-page`);
    return res.data;
};

const setLastReadPage = async (topicId, page) => {
    const res = await api.post(`/topics/${topicId}/last-page`, { page });
    return res.data;
};

export {
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
    toggleLike,
    getLastReadPage,
    setLastReadPage
};