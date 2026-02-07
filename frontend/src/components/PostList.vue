
<script setup>
import { usePostStore } from '../posts';
import { useSocketStore } from '../stores/socket';
import * as postService from '../services/postService';
import tagService from '../services/tagService';
import { ref, onMounted, onBeforeUnmount, watch, defineExpose, nextTick } from 'vue';
import PostItem from './PostItem.vue';

const props = defineProps({ 
    topicId: String,
    isSidebar: {
        type: Boolean,
        default: false
    },
    showPosts: {
        type: Boolean,
        default: true
    },
    showForm: {
        type: Boolean,
        default: true
    }
});

const emit = defineEmits(['reply']);

const postStore = usePostStore();
const socketStore = useSocketStore();

const newPostContent = ref("");
const isAdding = ref(false);
const addError = ref("");
const selectedTagIds = ref([]);
const availableTags = ref([]);
const replyingToPostId = ref(null);
const replyingToPost = ref(null);

const currentPage = ref(1);
const pageSize = ref(20);
const totalPosts = ref(0);
const totalPages = ref(0);

const load = async () => {
    try {
        const data = await postService.fetchPosts(props.topicId, currentPage.value, pageSize.value);
        postStore.setPosts({ posts: data.posts || [] });
        totalPosts.value = data.total || 0;
        totalPages.value = data.pages || 0;
    } catch (err) {
        console.error('Error loading posts:', err);
    }
}

const handleNewPost = (post) => {
    console.log('Received new post:', post);
    const postTopicId = post.topicId?._id || post.topicId;
    const currentTopicId = props.topicId;
    
    console.log(`Comparing topicIds: post=${postTopicId}, current=${currentTopicId}`);
    
    if (postTopicId === currentTopicId) {
        postStore.addPost(post);
        console.log(' Post added to store');
    } else {
        console.log('Topic does not match, ignoring post');
    }
};

const clearForm = () => {
    newPostContent.value = "";
    selectedTagIds.value = [];
    addError.value = "";
    replyingToPostId.value = null;
    replyingToPost.value = null;
};

const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
        load();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

const changePageSize = (newSize) => {
    pageSize.value = newSize;
    currentPage.value = 1; // Reset to first page
    load();
};

const goToPreviousPage = () => {
    if (currentPage.value > 1) {
        goToPage(currentPage.value - 1);
    }
};

const goToNextPage = () => {
    if (currentPage.value < totalPages.value) {
        goToPage(currentPage.value + 1);
    }
};

const jumpToPost = async (postId) => {
    await nextTick();
    const elemel = document.getElementById(`post-${postId}`);
    if (elemel) {
        elemel.scrollIntoView({behavior: "smooth", block: "center"});
        elemel.classList.add('highlight-jump');
        setTimeout(() => elemel.classList.remove('hightlight-jump'), 200);
    }
}

onMounted(() => {
    console.log('Component mounted for topic:', props.topicId);
    load();

    // Załaduj tagi
    tagService.getTags().then(tags => {
        availableTags.value = tags;
    }).catch(err => {
        console.error('Error loading tags:', err);
    });

    socketStore.on("post:new", handleNewPost);
    console.log('Listening for post:new events');

    if (socketStore.connected) {
        console.log('Socket already connected, joining topic immediately');
        socketStore.joinTopic(props.topicId);
    }
});

onBeforeUnmount(() => {
    console.log('Component unmounting');
    socketStore.off("post:new", handleNewPost);
    socketStore.leaveTopic(props.topicId);
});

watch(() => socketStore.connected, (isConnected) => {
    console.log(`Socket connection changed: ${isConnected}`);
    if (isConnected && props.topicId) {
        console.log('Socket connected, joining topic:', props.topicId);
        socketStore.joinTopic(props.topicId);
    }
});

watch(() => props.topicId, (newTopicId, oldTopicId) => {
    console.log(`Topic changed from ${oldTopicId} to ${newTopicId}`);
    if (oldTopicId) {
        socketStore.leaveTopic(oldTopicId);
    }
    if (newTopicId) {
        load();
        if (socketStore.connected) {
            socketStore.joinTopic(newTopicId);
        }
    }
});

const addPost = async () => {
    if (!newPostContent.value.trim()) return;
    isAdding.value = true;
    addError.value = "";
    console.log('Sending new post to API...');
    try {
        // Send the content without adding mention - that's only for display
        await postService.createPost(
            props.topicId,
            newPostContent.value,
            replyingToPostId.value,
            selectedTagIds.value
        );
        console.log('Post created successfully');
        clearForm();
    } catch (err) {
        console.error('Error creating post:', err);
        addError.value = err?.response?.data?.message || 'Błąd dodawania posta';
    } finally {
        isAdding.value = false;
    }
}

const setReplyTo = ({ post, author }) => {
    replyingToPostId.value = post._id;
    replyingToPost.value = {
        ...post,
        author: author
    };
    
    // Emit event to parent for sidebar coordination (no text added to textarea)
    emit('reply', { post, author });
}

const cancelReply = () => {
    replyingToPostId.value = null;
    replyingToPost.value = null;
}

const handleReplyFromMain = (replyData) => {
    // This method is called from parent (TopicView) to set reply in this form
    const { post, author } = replyData;
    replyingToPostId.value = post._id;
    replyingToPost.value = {
        ...post,
        author: author
    };
}

defineExpose({
    handleReplyFromMain
});

</script>

<template>
    <div class="post-list-container" :class="{ 'sidebar-mode': isSidebar }">
        <!-- Lista postów (ukryta jeśli showPosts=false lub w trybie sidebar) -->
        <div v-if="showPosts" class="posts-section">
            <PostItem 
                v-for="post in postStore.posts" 
                :key="post._id || post.id" 
                :post="post"
                @reply="setReplyTo"
                @jump="jumpToPost"
            />
        </div>

        <!-- Formularz dodawania posta -->
        <form v-if="showForm" @submit.prevent="addPost" class="add-post-form">
            <h3 class="form-title">Napisz odpowiedź</h3>
            
            <div v-if="replyingToPost" class="reply-info">
                <div class="reply-content">
                    <div>
                        <small class="reply-author">Odpowiadasz na post autora <strong>{{ replyingToPost.author }}</strong></small>
                        <div class="reply-preview">{{ replyingToPost.content.substring(0, 100) }}{{ replyingToPost.content.length > 100 ? '...' : '' }}</div>
                    </div>
                    <button type="button" @click="cancelReply" class="btn-cancel-reply">X</button>
                </div>
            </div>
            
            <div class="form-group" :class="{ 'sidebar-textarea': isSidebar }">
                <textarea 
                    v-model="newPostContent" 
                    :rows="isSidebar ? 3 : 4" 
                    class="form-textarea"
                    :placeholder="isSidebar ? 'Dodaj odpowiedź...' : 'Napisz swoją opinię...'" 
                    :disabled="isAdding"
                ></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Tagi:</label>
                <select v-model="selectedTagIds" multiple class="form-select">
                    <option v-for="tag in availableTags" :key="tag._id" :value="tag._id">
                        {{ tag.name }}
                    </option>
                </select>
                <small class="form-help">Przytrzymaj Ctrl/Cmd aby wybrać wiele tagów</small>
            </div>

            <div v-if="selectedTagIds.length" class="selected-tags">
                <div class="selected-tags-title">Wybrane tagi:</div>
                <div class="tags-chips">
                    <span v-for="tagId in selectedTagIds" :key="tagId" class="tag-chip">
                        {{ availableTags.find(t => t._id === tagId)?.name }}
                    </span>
                </div>
            </div>
            
            <div v-if="addError" class="error-message">
                {{ addError }}
            </div>
            
            <div class="form-actions" :class="{ 'sidebar-actions': isSidebar }">
                <button type="submit" :disabled="isAdding || !newPostContent.trim()" class="btn btn-primary btn-large">
                    {{ isAdding ? 'Dodawanie...' : 'Dodaj post' }}
                </button>
            </div>
        </form>

        <div v-if="showPosts && totalPages > 0" class="pagination-section">
            <div class="pagination-info">
                <div class="page-size-control">
                    <label class="page-size-label">
                        <strong>Wpisów na stronę:</strong>
                        <select v-model.number="pageSize" @change="changePageSize(pageSize)" class="form-select-small">
                            <option :value="10">10</option>
                            <option :value="20" selected>20</option>
                            <option :value="50">50</option>
                            <option :value="100">100</option>
                        </select>
                    </label>
                </div>
                <div class="page-counter">
                    <small>Strona <strong>{{ currentPage }}</strong> z <strong>{{ totalPages }}</strong> (razem <strong>{{ totalPosts }}</strong> wpisów)</small>
                </div>
            </div>
            
            <div class="pagination-controls">
                <button 
                    @click="goToPreviousPage"
                    :disabled="currentPage === 1"
                    class="btn-pagination"
                    :style="{ opacity: currentPage === 1 ? 0.5 : 1 }"
                >
                    ← Poprzednia
                </button>
                
                <div class="page-numbers">
                    <button 
                        v-for="page in Math.min(5, totalPages)"
                        :key="page"
                        @click="goToPage(page)"
                        class="page-button"
                        :class="{ active: page === currentPage }"
                    >
                        {{ page }}
                    </button>
                    
                    <span v-if="totalPages > 5" class="pagination-ellipsis">...</span>
                    
                    <button 
                        v-if="totalPages > 5 && currentPage > totalPages - 2"
                        @click="goToPage(totalPages)"
                        class="page-button"
                    >
                        {{ totalPages }}
                    </button>
                </div>
                
                <button 
                    @click="goToNextPage"
                    :disabled="currentPage === totalPages"
                    class="btn-pagination"
                    :style="{ opacity: currentPage === totalPages ? 0.5 : 1 }"
                >
                    Następna →
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.post-list-container {
    max-width: 1000px;
    margin: 0 auto;
    color: #eee;
}

.post-list-container.sidebar-mode {
    max-width: 100%;
    margin: 0;
}

.post-list-container.sidebar-mode .add-post-form {
    padding: 15px;
    border-radius: 4px;
    margin-bottom: 15px;
}

.post-list-container.sidebar-mode .form-title {
    font-size: 0.9em;
    margin-bottom: 12px;
    padding-bottom: 8px;
}

.post-list-container.sidebar-mode .form-textarea {
    min-height: 60px;
}

.post-list-container.sidebar-mode .form-group {
    margin-bottom: 12px;
}

.post-list-container.sidebar-mode .form-label {
    margin-bottom: 5px;
    font-size: 0.9em;
}

.post-list-container.sidebar-mode .btn {
    padding: 8px 10px;
    font-size: 0.85em;
}

.post-list-container.sidebar-mode .btn-large {
    padding: 10px;
}

.post-list-container.sidebar-mode .error-message {
    padding: 8px;
    margin-bottom: 12px;
    font-size: 0.85em;
}

.posts-section {
    margin-bottom: 40px;
}

.add-post-form {
    background-color: #2d2d2d;
    border: 2px solid #ffff00;
    padding: 25px;
    border-radius: 4px;
    margin-bottom: 30px;
}

.form-title {
    color: #ffff00;
    margin-top: 0;
    margin-bottom: 20px;
    border-bottom: 2px solid #ffff00;
    padding-bottom: 10px;
}

.form-group {
    margin-bottom: 20px;
}

.form-label {
    display: block;
    color: #ffff00;
    font-weight: bold;
    margin-bottom: 8px;
}

.form-help {
    display: block;
    color: #999;
    font-size: 0.85em;
    margin-top: 5px;
}

.form-textarea,
.form-select {
    width: 100%;
    padding: 12px;
    border: 1px solid #ffff00;
    border-radius: 4px;
    background-color: #1a1a1a;
    color: #fff;
    font-family: "Pixelify Sans", monospace;
    font-size: 0.95em;
    box-sizing: border-box;
}

.form-select-small {
    padding: 6px 10px;
    border: 1px solid #ffff00;
    border-radius: 4px;
    background-color: #1a1a1a;
    color: #fff;
    font-family: "Pixelify Sans", sans-serif;
}

.form-textarea {
    resize: vertical;
    min-height: 100px;
}

.form-textarea:focus,
.form-select:focus,
.form-select-small:focus {
    outline: none;
    border-color: #ffff00;
}

.form-textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.reply-info {
    background-color: rgba(255, 255, 0, 0.384);
    padding: 15px;
    border-radius: 4px;
    margin-bottom: 20px;
}

.reply-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    padding: auto;
    margin:0;
}

.reply-author {
    color: #ffff00;
    font-weight: bold;
}

.reply-preview {
    color: #bbb;
    font-style: italic;
    margin-top: 5px;
}

.btn-cancel-reply {
    background-color: #000000;
    color: yellow;
    font-weight: bolder;
    border: 3px solid yellow;
    border-radius: none;
    padding: 8px 12px;
    cursor: pointer;
}

.btn-cancel-reply:hover {
    background-color: yellow;
    color: black;
}

/* Tagi */
.selected-tags {
    background-color: yellow;
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 20px;
}

.selected-tags-title {
    color: #000000;
    font-weight: bold;
    margin-bottom: 8px;
}

.tags-chips {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.tag-chip {
    background-color: #000000;
    color: #ffff00;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 0.9em;
    border: 1px solid #ffff00;
}


/* Przyciski */
.form-actions {
    margin-top: 20px;
}

.form-actions.sidebar-actions {
    margin-top: 12px;
}

.form-actions.sidebar-actions .btn-large {
    padding: 10px 15px;
    font-size: 0.9em;
}

.btn {
    padding: 10px 15px;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    font-family: "Pixelify Sans", sans-serif;
}

.btn-primary {
    background-color: #ffff00;
    color: #000;
}

.btn-primary:hover:not(:disabled) {
    background-color: #e6e600;
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-large {
    width: 100%;
    padding: 12px;
    font-size: 1em;
}

.btn-success {
    background-color: #ffff00;
    color: #000;
}

.btn-success:hover {
    background-color: #e6e600;
}

.btn-secondary {
    background-color: #666;
    color: #fff;
}

.btn-secondary:hover {
    background-color: #555;
}

.btn-info {
    background-color: #ffff00;
    color: #000;
}

.btn-info:hover {
    background-color: #e6e600;
}

.error-message {
    background-color: #ff6b6b;
    color: white;
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 20px;
    border-left: 4px solid #ff5252;
}

.pagination-section {
    margin-top: 40px;
    padding: 20px;
    background-color: #2d2d2d;
    border: 1px solid #ffff00;
    border-radius: 4px;
}

.pagination-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 15px;
}

.page-size-control {
    display: flex;
    align-items: center;
    gap: 10px;
}

.page-size-label {
    color: #ffff00;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 8px;
}

.page-counter {
    color: #ddd;
}

.page-counter small {
    font-size: 0.95em;
}

.page-counter strong {
    color: #ffff00;
}

.pagination-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    flex-wrap: wrap;
}

.btn-pagination {
    padding: 8px 12px;
    background-color: #ffff00;
    color: #000;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
}

.btn-pagination:hover:not(:disabled) {
    background-color: #e6e600;
}

.btn-pagination:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.page-numbers {
    display: flex;
    gap: 5px;
    align-items: center;
}

.page-button {
    padding: 6px 10px;
    background-color: #1a1a1a;
    color: #fff;
    border: 1px solid #ffff00;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
}

.page-button:hover {
    background-color: #ffff00;
    color: #000;
}

.page-button.active {
    background-color: #ffff00;
    color: #000;
    border-color: #e6e600;
}

.pagination-ellipsis {
    color: #999;
}

.highlight-jump {
    outline: 2px solid #ffff00;
    transition: outline 0.3s;
}
</style>