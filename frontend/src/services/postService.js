import api from "./api";

const fetchPosts = async (topicId) => {
    const res = await api.get(`/topics/${topicId}/posts?limit=5000`);
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