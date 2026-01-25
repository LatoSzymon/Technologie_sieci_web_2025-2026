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
    }
});

export {postStore};