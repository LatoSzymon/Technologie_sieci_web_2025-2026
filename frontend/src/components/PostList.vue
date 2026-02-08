
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

const load = async (page = 1, mode = 'replace') => {
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
        totalPosts.value = data.total || 0;
        totalPages.value = data.pages || 0;
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
        if (currentPage.value === totalPages.value) {
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
    try {
        while (currentPage.value < totalPages.value) {
            await load(currentPage.value + 1, 'append');
        }
    } finally {
        isLoadingMore.value = false;
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

onMounted(() => {
    console.log('Component mounted for topic:', props.topicId);
    load(1, 'replace');

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
        load(1, 'replace');
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

defineExpose({
    handleReplyFromMain
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
    color: #ffff00;
}

.pagination-controls {
    display: flex;
    justify-content: center;
    align-items: center;
}

.btn-pagination {
    padding: 10px 16px;
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

.highlight-jump {
    outline: 2px solid #ffff00;
    transition: outline 0.3s;
}
</style>