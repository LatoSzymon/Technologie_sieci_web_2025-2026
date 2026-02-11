
<script setup>
import { usePostStore } from '../stores/posts';
import { useSocketStore } from '../stores/socket';
import * as postService from '../services/postService';
import tagService from '../services/tagService';
import { ref, onMounted, onBeforeUnmount, watch, defineExpose, nextTick, computed } from 'vue';
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

const listRef = ref(null);
const formRef = ref(null);
const posts = computed(() => postStore.getPosts(props.topicId));
const pagination = computed(() => postStore.getPagination(props.topicId));

const newPostContent = ref("");
const newPostTextarea = ref(null);
const isAdding = ref(false);
const addError = ref("");
const selectedTagIds = ref([]);
const availableTags = ref([]);
const replyingToPostId = ref(null);
const replyingToPost = ref(null);

const selectedCodeLanguage = ref('');
const codeLanguages = [
    'bash',
    'c',
    'cpp',
    'csharp',
    'css',
    'go',
    'html',
    'java',
    'javascript',
    'json',
    'kotlin',
    'php',
    'python',
    'ruby',
    'rust',
    'sql',
    'swift',
    'typescript',
    'yaml'
];

const currentPage = ref(1);
const pageSize = ref(15);
const totalPosts = ref(0);
const totalPages = ref(0);
const isLoadingMore = ref(false);
const isLoadingHistory = ref(false);

const loadTags = async () => {
    if (!props.showForm) return;
    try {
        const tags = await tagService.getTags(props.topicId);
        availableTags.value = tags;
    } catch (err) {
        console.error('Error loading tags:', err);
    }
};

const handleTagsChanged = () => {
    loadTags();
};

const persistLastPage = async (page) => {
    if (!props.showPosts || !props.topicId) return;
    try {
        await postService.setLastReadPage(props.topicId, page);
    } catch (err) {
        console.warn('Nie udalo sie zapisac ostatniej strony', err);
    }
};

const load = async (page = 1, mode = 'replace', persist = true) => {
    try {
        const data = await postService.fetchPosts(props.topicId, page, pageSize.value);
        postStore.setPosts({
            topicId: props.topicId,
            posts: data.posts || [],
            page: data.page,
            pages: data.pages,
            total: data.total,
            mode
        });
        currentPage.value = data.page || page;
        totalPosts.value = Number.isFinite(data.total)
            ? data.total
            : (data.posts || []).length;
        const fallbackPages = Math.max(1, Math.ceil((totalPosts.value || 0) / pageSize.value));
        totalPages.value = Number.isFinite(data.pages)
            ? Math.max(1, data.pages)
            : fallbackPages;
        if (persist) {
            await persistLastPage(currentPage.value);
        }
    } catch (err) {
        console.error('Error loading posts:', err);
    }
}

// const loadLastPage = async () => {
//     const lastPage = Math.max(1, Math.ceil((totalPosts.value + 1) / pageSize.value));
//     currentPage.value = lastPage;
//     await load(lastPage, 'replace');
//     await scrollToBottom();
// };

const handleNewPost = async (post) => {
    console.log('Received new post:', post);
    const postTopicId = post.topicId?._id || post.topicId;
    const currentTopicId = props.topicId;
    
    console.log(`Comparing topicIds: post=${postTopicId}, current=${currentTopicId}`);
    
    if (postTopicId === currentTopicId) {
        const effectiveTotalPages = Math.max(1, totalPages.value || 0);
        if (currentPage.value === effectiveTotalPages) {
            postStore.addPost(props.topicId, post);
            totalPosts.value += 1;
            await scrollToBottom();
        } else {
            totalPosts.value += 1;
            totalPages.value = Math.max(totalPages.value, Math.ceil(totalPosts.value / pageSize.value));
        }
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

const insertCodeBlock = (textareaRef, contentRef, language) => {
    const textarea = textareaRef.value;
    if (!textarea) return;

    const start = textarea.selectionStart ?? contentRef.value.length;
    const end = textarea.selectionEnd ?? contentRef.value.length;
    const selectedText = contentRef.value.slice(start, end);
    const langToken = language ? language.trim() : '';
    const openFence = `\n\`\`\`${langToken}\n`;
    const closeFence = `\n\`\`\`\n`;
    const before = contentRef.value.slice(0, start);
    const after = contentRef.value.slice(end);

    contentRef.value = `${before}${openFence}${selectedText}${closeFence}${after}`;

    nextTick(() => {
        textarea.focus();
        const cursorPos = before.length + openFence.length + selectedText.length;
        textarea.setSelectionRange(cursorPos, cursorPos);
    });
};

const insertCodeBlockIntoNewPost = () => {
    insertCodeBlock(newPostTextarea, newPostContent, selectedCodeLanguage.value);
};

const loadMore = async () => {
    if (currentPage.value >= totalPages.value || isLoadingMore.value) return;
    isLoadingMore.value = true;
    try {
        await load(currentPage.value + 1, 'append');
    } finally {
        isLoadingMore.value = false;
    }
};

const loadRemainingPages = async () => {
    if (isLoadingMore.value) return;
    isLoadingMore.value = true;
    const pageBefore = currentPage.value;
    try {
        while (currentPage.value < totalPages.value) {
            await load(currentPage.value + 1, 'append', false);
        }
        await persistLastPage(pageBefore);
    } finally {
        isLoadingMore.value = false;
    }
};

const loadPreviousPages = async (startPage) => {
    if (isLoadingHistory.value || startPage < 1) return;
    isLoadingHistory.value = true;
    try {
        for (let page = startPage; page >= 1; page -= 1) {
            const data = await postService.fetchPosts(props.topicId, page, pageSize.value);
            postStore.setPosts({
                topicId: props.topicId,
                posts: data.posts || [],
                page: currentPage.value || data.page || startPage,
                pages: data.pages,
                total: data.total,
                mode: 'prepend'
            });
        }
    } catch (err) {
        console.error('Error loading previous pages:', err);
    } finally {
        isLoadingHistory.value = false;
    }
};


const scrollToBottom = async () => {
    await nextTick();
    const el = listRef.value;
    if (el) {
        el.scrollTop = el.scrollHeight;
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

const loadInitialPage = async () => {
    if (!props.showPosts || !props.topicId) {
        await load(1, 'replace');
        return;
    }

    try {
        const data = await postService.getLastReadPage(props.topicId);
        const page = data?.page && data.page > 0 ? data.page : 1;
        await load(page, 'replace');
        if (page > 1) {
            await loadPreviousPages(page - 1);
        }
    } catch (err) {
        await load(1, 'replace');
    }
};

onMounted(() => {
    console.log('Component mounted for topic:', props.topicId);
    loadInitialPage();

    loadTags();

    socketStore.on("post:new", handleNewPost);
    console.log('Listening for post:new events');
    socketStore.on('tag:created', handleTagsChanged);
    socketStore.on('tag:updated', handleTagsChanged);
    socketStore.on('tag:deleted', handleTagsChanged);

    if (socketStore.connected) {
        console.log('Socket already connected, joining topic immediately');
        socketStore.joinTopic(props.topicId);
    }
});

onBeforeUnmount(() => {
    console.log('Component unmounting');
    socketStore.off("post:new", handleNewPost);
    socketStore.off('tag:created', handleTagsChanged);
    socketStore.off('tag:updated', handleTagsChanged);
    socketStore.off('tag:deleted', handleTagsChanged);
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
        loadInitialPage();
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
        const response = await postService.createPost(
            props.topicId,
            newPostContent.value,
            replyingToPostId.value,
            selectedTagIds.value
        );
        console.log('Post created successfully');
        totalPosts.value += 1;
        totalPages.value = Math.max(totalPages.value, Math.ceil(totalPosts.value / pageSize.value));
        await loadRemainingPages();
        const createdId = response?.post?._id || response?.post?.id;
        if (createdId && !posts.value.some(p => (p._id || p.id) === createdId)) {
            postStore.addPost(props.topicId, response.post);
        }
        if (createdId) {
            await jumpToPost(createdId);
        } else {
            await scrollToBottom();
        }
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

const scrollToForm = async () => {
    await nextTick();
    if (formRef.value) {
        formRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (newPostTextarea.value) {
            newPostTextarea.value.focus();
        }
    }
};

defineExpose({
    handleReplyFromMain,
    scrollToForm
});

</script>

<template>
    <div class="post-list-container" :class="{ 'sidebar-mode': isSidebar }">
        <!-- Lista postów (ukryta jeśli showPosts=false lub w trybie sidebar) -->
        <div v-if="showPosts" ref="listRef" class="posts-section">
            <PostItem 
                v-for="post in posts" 
                :key="post._id || post.id" 
                :post="post"
                @reply="setReplyTo"
                @jump="jumpToPost"
            />
        </div>

        <form
            v-if="showForm"
            ref="formRef"
            @submit.prevent="addPost"
            class="add-post-form"
            :class="{ 'reply-wide': !isSidebar }"
        >
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
                <div class="code-toolbar">
                    <select v-model="selectedCodeLanguage" class="form-select-small" :disabled="isAdding">
                        <option value="">Kod (bez jezyka)</option>
                        <option v-for="lang in codeLanguages" :key="lang" :value="lang">
                            {{ lang }}
                        </option>
                    </select>
                    <button type="button" class="btn btn-secondary btn-code" @click="insertCodeBlockIntoNewPost" :disabled="isAdding">
                        Wstaw blok kodu
                    </button>
                    <small class="form-help code-help">Zaznacz fragment i kliknij, aby owinac go blokiem kodu.</small>
                </div>
                <textarea 
                    ref="newPostTextarea"
                    v-model="newPostContent" 
                    :rows="isSidebar ? 3 : 4" 
                    class="form-textarea"
                    :placeholder="isSidebar ? 'Dodaj odpowiedź...' : 'Napisz swoją opinię...'" 
                    :disabled="isAdding"
                ></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Tagi:</label>
                <!-- <select v-model="selectedTagIds" multiple class="form-select">
                    <option v-for="tag in availableTags" :key="tag._id" :value="tag._id">
                        {{ tag.name }}
                    </option>
                </select>
                <small class="form-help">Przytrzymaj Ctrl/Cmd aby wybrać wiele tagów</small> -->
                <div class="tag-checkboxes">
                    <label v-for="tag in availableTags" :key="tag._id" class="tag-checkbox">
                        <input type="checkbox" :value="tag._id" v-model="selectedTagIds" />
                        <span>#{{ tag.name }}</span>
                    </label>
                </div>
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

        <div v-if="showPosts && totalPages > 1" class="pagination-section">
            <div class="pagination-info">
                <div class="page-counter">
                    <small>Załadowano <strong>{{ posts.length }}</strong> z <strong>{{ totalPosts }}</strong> wpisów</small>
                </div>
            </div>

            <div class="pagination-controls">
                <button
                    @click="loadMore"
                    :disabled="currentPage >= totalPages || isLoadingMore"
                    class="btn-pagination"
                    :style="{ opacity: currentPage >= totalPages || isLoadingMore ? 0.5 : 1 }"
                >
                    {{ isLoadingMore ? 'Ładowanie...' : 'Załaduj więcej' }}
                </button>
            </div>
        </div>
        <button
            v-if="showForm && showPosts && !isSidebar"
            type="button"
            class="reply-fab"
            @click="scrollToForm"
        >
            Napisz odpowiedź
        </button>
    </div>
</template>

<style scoped>
.post-list-container {
    max-width: 980px;
    margin: 0 auto;
    color: #eee;
}

.post-list-container.sidebar-mode {
    max-width: 100%;
    margin: 0;
}

.post-list-container.sidebar-mode .add-post-form {
    padding: 18px;
    border-radius: 4px;
    margin-bottom: 16px;
}

.post-list-container.sidebar-mode .form-title {
    font-size: 0.9em;
    margin-bottom: 12px;
    padding-bottom: 8px;
}

.post-list-container.sidebar-mode .form-textarea {
    min-height: 120px;
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
    margin-bottom: 28px;
}

.add-post-form {
    background-color: var(--panel);
    border: 2px solid var(--border);
    padding: 20px;
    border-radius: 4px;
    margin-bottom: 20px;
}

.add-post-form.reply-wide {
    width: 100%;
    max-width: 1240px;
    margin-left: auto;
    margin-right: auto;
}

.form-title {
    color: var(--accent);
    margin-top: 0;
    margin-bottom: 14px;
    border-bottom: 2px solid var(--border);
    padding-bottom: 8px;
}

.form-group {
    margin-bottom: 20px;
}

.form-label {
    display: block;
    color: var(--accent);
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
    border: 1px solid var(--border);
    border-radius: 4px;
    background-color: #111111;
    color: #fff;
    font-family: "Pixelify Sans", monospace;
    font-size: 0.95em;
    box-sizing: border-box;
}

.form-select-small {
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background-color: #111111;
    color: #fff;
    font-family: "Pixelify Sans", sans-serif;
}

.code-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    margin-bottom: 10px;
}

.code-help {
    margin-top: 0;
}

.btn-code {
    padding: 6px 10px;
    font-size: 0.9em;
}

.form-textarea {
    resize: vertical;
    min-height: 140px;
}

.form-textarea:focus,
.form-select:focus,
.form-select-small:focus {
    outline: none;
    border-color: var(--accent-strong);
}

.form-textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.reply-info {
    background-color: rgba(229, 242, 103, 0.18);
    padding: 15px;
    border-radius: 4px;
    margin-bottom: 20px;
}

.reply-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    padding: 0;
    margin: 0;
}

.reply-author {
    color: var(--accent);
    font-weight: bold;
}

.reply-preview {
    color: #bbb;
    font-style: italic;
    margin-top: 5px;
}

.btn-cancel-reply {
    background-color: #000000;
    color: var(--accent);
    font-weight: bolder;
    border: 2px solid var(--border);
    border-radius: 4px;
    padding: 8px 12px;
    cursor: pointer;
}

.btn-cancel-reply:hover {
    background-color: var(--accent);
    color: #000;
}

.tag-checkboxes {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 8px;
    margin-top: 10px;
    padding: 10px;
    border: 1px solid var(--border);
    background: #0d0d0d;
}

.tag-checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text);
    font-size: 0.9em;
}

.tag-checkbox input {
    accent-color: var(--accent);
}

/* Tagi */
.selected-tags {
    background-color: rgba(229, 242, 103, 0.12);
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 20px;
}

.selected-tags-title {
    color: var(--accent);
    font-weight: bold;
    margin-bottom: 8px;
}

.tags-chips {
    display: flex;
    gap: 8px;
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 2px;
}

.tag-chip {
    background-color: #0b0b0b;
    color: var(--accent);
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 0.9em;
    border: 1px solid var(--border);
    white-space: nowrap;
}


/* Przyciski */
.form-actions {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
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
    background-color: var(--accent);
    color: #000;
}

.btn-primary:hover:not(:disabled) {
    background-color: var(--accent-strong);
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-large {
    width: auto;
    min-width: 170px;
    padding: 10px 16px;
    font-size: 0.95em;
}

.btn-success {
    background-color: var(--success);
    color: #000;
}

.btn-success:hover {
    background-color: var(--success);
}

.btn-secondary {
    background-color: #2b2b2b;
    color: var(--text);
}

.btn-secondary:hover {
    background-color: #3b3b3b;
}

.btn-info {
    background-color: var(--accent);
    color: #000;
}

.btn-info:hover {
    background-color: var(--accent-strong);
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
    margin-top: 28px;
    padding: 20px;
    background-color: var(--panel);
    border: 1px solid var(--border);
    border-radius: 4px;
}

.pagination-info {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 15px;
}

.page-counter {
    color: #ddd;
}

.page-counter small {
    font-size: 0.95em;
}

.page-counter strong {
    color: var(--accent);
}

.pagination-controls {
    display: flex;
    justify-content: center;
    align-items: center;
}

.btn-pagination {
    padding: 10px 16px;
    background-color: var(--accent);
    color: #000;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
}

.btn-pagination:hover:not(:disabled) {
    background-color: var(--accent-strong);
}

.btn-pagination:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.highlight-jump {
    outline: 2px solid var(--accent);
    transition: outline 0.3s;
}

.reply-fab {
    position: fixed;
    /* right: 24px; */
    bottom: 24px;
    z-index: 30;
    border: 2px solid var(--border);
    background: var(--accent);
    color: #000;
    padding: 10px 14px;
    font-weight: 700;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}

.reply-fab:hover {
    background: var(--accent-strong);
}
</style>