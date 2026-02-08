import { defineStore } from 'pinia';
import { ref } from 'vue';

export const usePostStore = defineStore('posts', () => {
    const postsByTopic = ref(new Map());
    const paginationByTopic = ref(new Map());

    const getPosts = (topicId) => postsByTopic.value.get(topicId) || [];
    const getPagination = (topicId) => paginationByTopic.value.get(topicId) || {page: 1, pages: 1, total: 0};

    const setPosts = ({topicId, posts: newPosts, page, pages, total, mode = 'replace'}) => {
        const current = postsByTopic.value.get(topicId) || [];
        const existingIds = new Set(current.map(p => p._id || p.id));
        let merged = [];

        if (mode === 'append') {
            merged = [...current];
            (newPosts || []).forEach(post => {
                const id = post._id || post.id;
                if (!existingIds.has(id)) {
                    merged.push(post);
                    existingIds.add(id);
                }
            });
        } else if (mode === 'prepend') {
            merged = [...current];
            [...(newPosts || [])].reverse().forEach(post => {
                const id = post._id || post.id;
                if (!existingIds.has(id)) {
                    merged.unshift(post);
                    existingIds.add(id);
                }
            });
        } else {
            merged = newPosts || [];
        }

        postsByTopic.value.set(topicId, merged);
        paginationByTopic.value.set(topicId, {page, pages, total});
    };

    const addPost = (topicId, post) => {
        const current = postsByTopic.value.get(topicId) || [];
        const exists = current.some(p => (p._id || p.id) === (post._id || post.id));

        if (!exists) {
            current.push(post);
            postsByTopic.value.set(topicId, current);
        }
    };

    const removePost = (topicId, postId) => {
        const current = postsByTopic.value.get(topicId) || [];
        postsByTopic.value.set(topicId, current.filter(a => (a._id || a.id) !== postId));
    };

    const updatePostLikes = (topicId, postId, likesCount, liked, likes) => {
        const current = postsByTopic.value.get(topicId) || [];
        const post = current.find(p => (p._id || p.id) === postId);
        if (post) {
            post.likesCount = likesCount;
            post.userLiked = liked;
            if (likes && Array.isArray(likes)) {
                post.likes = likes;
            }
        }
    };

    const updatePost = (topicId, updatedPost) => {
        const current = postsByTopic.value.get(topicId) || [];
        const updatedId = updatedPost?._id || updatedPost?.id;
        if (!updatedId) return;

        const idx = current.findIndex(p => (p._id || p.id) === updatedId);
        if (idx === -1) return;

        current[idx] = {
            ...current[idx],
            ...updatedPost
        };
        postsByTopic.value.set(topicId, current);
    };

    return {
        postsByTopic, paginationByTopic, getPosts, getPagination, setPosts, addPost, removePost, updatePostLikes, updatePost
    };
});
