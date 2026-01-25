import { reactive } from "vue";

const postStore = reactive({
    posts: [],
    page: 1,
    totalPages: 1,
    lastReadPage: {},
    setPosts({posts, page, totalPages, topicId}) {
        this.posts = posts;
        this.page = page;
        this.totalPages = totalPages;
        if (topicId) {
            this.lastReadPage[topicId] = page;
        }
    },
    addPost(post) {
        // Dodaj post tylko jeśli nie istnieje już na liście
        if (!this.posts.some(p => p.id === post.id)) {
            this.posts.unshift(post); // Dodaj na początek (jeśli sortujesz od najnowszych)
        }
    }
});

export {postStore};