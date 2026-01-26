import api from "./api";

const fetchPosts = async (topicId) => {
    const res = await api.get(`/topics/${topicId}/posts?limit=5000`);

    return res.data;
};

export {fetchPosts};