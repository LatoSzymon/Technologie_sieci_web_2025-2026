import api from "./api";

const fetchPosts = async (topicId, page = 1, limit = 20) => {
    const res = await api.get(`/topics/${topicId}/posts?page=${page}&limit=${limit}`);
    return res.data;
};

const createPost = async (topicId, content, codeBlocks = [], replyTo = null, tags = []) => {
    const res = await api.post('/posts', {
        topicId,
        content,
        codeBlocks,
        replyTo,
        tags
    });
    return res.data;
};

const updatePost = async (postId, content, codeBlocks = []) => {
    const res = await api.put(`/posts/${postId}`, {
        content,
        codeBlocks
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

export {
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
    toggleLike
};