import { defineStore } from 'pinia';
import { ref } from 'vue';

export const usePostStore = defineStore('posts', () => {
    const posts = ref([]);

    const setPosts = ({ posts: newPosts }) => {
        posts.value = newPosts || [];
    };

    const addPost = (post) => {
        const exists = posts.value.some(p => {
            const postId = p._id || p.id;
            const newPostId = post._id || post.id;
            return postId === newPostId;
        });
        
        if (!exists) {
            posts.value.push(post);
        }
    };

    const removePost = (postId) => {
        posts.value = posts.value.filter(p => {
            const id = p._id || p.id;
            return id !== postId;
        });
    };

    const updatePostLikes = (postId, likesCount, liked, likes) => {
        const post = posts.value.find(p => (p._id || p.id) === postId);
        if (post) {
            post.likesCount = likesCount;
            post.userLiked = liked;
            // Jeśli websocket przesłał pełny array likes, update go
            if (likes && Array.isArray(likes)) {
                post.likes = likes;
            }
        }
    };

    return {
        posts,
        setPosts,
        addPost,
        removePost,
        updatePostLikes
    };
});
