import api from "./api";

const fetchPosts = async (topicId, page=1) => {
    const res = await api.get(`/topics/${topicId}/posts?page=${page}`);

    return res.data;
}