import api from "./api";

const fetchPosts = async (topicId) => {
    // Pobierz wszystkie posty dla tematu (duży limit, brak paginacji na froncie)
    const res = await api.get(`/topics/${topicId}/posts?limit=5000`);

    return res.data;
};

export {fetchPosts};