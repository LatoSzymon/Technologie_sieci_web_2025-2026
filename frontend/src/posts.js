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
            posts.value.unshift(post);
        }
    };

    const removePost = (postId) => {
        posts.value = posts.value.filter(p => {
            const id = p._id || p.id;
            return id !== postId;
        });
    };

    return {
        posts,
        setPosts,
        addPost,
        removePost
    };
});
