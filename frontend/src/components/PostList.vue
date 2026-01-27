
<script setup>
import { usePostStore } from '../posts';
import { useSocketStore } from '../stores/socket';
import * as postService from '../services/postService';
import api from '../services/api';
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import PostItem from './PostItem.vue';

const props = defineProps({ 
    topicId: String 
});

const postStore = usePostStore();
const socketStore = useSocketStore();

const newPostContent = ref("");
const newCodeBlocks = ref([]);
const newCodeBlock = ref({ language: 'javascript', code: '' });
const isAdding = ref(false);
const addError = ref("");
const showCodeForm = ref(false);
const newPostTags = ref("");
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

const addCodeBlock = () => {
    if (newCodeBlock.value.code.trim()) {
        newCodeBlocks.value.push(JSON.parse(JSON.stringify(newCodeBlock.value)));
        newCodeBlock.value = { language: 'javascript', code: '' };
    }
};

const removeCodeBlock = (index) => {
    newCodeBlocks.value.splice(index, 1);
};

const clearForm = () => {
    newPostContent.value = "";
    newCodeBlocks.value = [];
    newCodeBlock.value = { language: 'javascript', code: '' };
    newPostTags.value = "";
    showCodeForm.value = false;
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

onMounted(() => {
    console.log('Component mounted for topic:', props.topicId);
    load();

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
        const tags = newPostTags.value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        
        await postService.createPost(
            props.topicId, 
            newPostContent.value, 
            newCodeBlocks.value,
            replyingToPostId.value,
            tags
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

const setReplyTo = (post) => {
    replyingToPostId.value = post._id;
    replyingToPost.value = post.content;
    window.scrollTo({ top: document.querySelector('form').offsetTop, behavior: 'smooth' });
}

const cancelReply = () => {
    replyingToPostId.value = null;
    replyingToPost.value = null;
}

</script>

<template>
    <div>
        <PostItem 
            v-for="post in postStore.posts" 
            :key="post._id || post.id" 
            :post="post"
            @reply="setReplyTo"
        />
        
        <form @submit.prevent="addPost" class="add-post-form">
            <h3>Nowy post</h3>
            
            <div v-if="replyingToPost" class="reply-info">
                <div class="reply-content">
                    <div>
                        <small class="reply-author">Odpowiadasz na post autora <strong>{{ replyingToPost.authorId?.login }}</strong></small>
                        <div class="reply-preview">{{ replyingToPost.content.substring(0, 100) }}...</div>
                    </div>
                    <button type="button" @click="cancelReply" class="btn-cancel-reply">✕ Anuluj</button>
                </div>
            </div>
            
            <div class="form-group">
                <textarea 
                    v-model="newPostContent" 
                    rows="3" 
                    class="textarea-content"
                    placeholder="Napisz nowy post..." 
                    :disabled="isAdding"
                ></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <strong>Tagi</strong> <small>(oddzielone przecinkami)</small>
                    <input 
                        v-model="newPostTags" 
                        type="text"
                        class="input-tags"
                        placeholder="np: javascript, vue, typescript"
                        :disabled="isAdding"
                    />
                </label>
            </div>
            
            <div v-if="newCodeBlocks.length" class="existing-codes">
                <h4>Bloki kodu ({{ newCodeBlocks.length }})</h4>
                <div v-for="(block, idx) in newCodeBlocks" :key="`add-${idx}`" class="code-block-item">
                    <span><strong>{{ block.language }}</strong> - {{ block.code.split('\n').length }} linii</span>
                    <button 
                        type="button"
                        @click="removeCodeBlock(idx)"
                        class="btn-remove-code"
                    >
                        Usuń
                    </button>
                </div>
            </div>
            
            <div v-if="showCodeForm" class="code-form">
                <h4>Dodaj blok kodu</h4>
                <div class="form-group">
                    <label class="form-label">
                        Kod:
                        <textarea 
                            v-model="newCodeBlock.code" 
                            class="textarea-code"
                            placeholder="Wklej kod tutaj..."
                        ></textarea>
                    </label>
                </div>
                <button 
                    type="button"
                    @click="addCodeBlock"
                    class="btn-add-code"
                >
                    Dodaj kod
                </button>
                <button 
                    type="button"
                    @click="showCodeForm = false"
                    class="btn-close-form"
                >
                    Zamknij formularz
                </button>
            </div>
            
            <div v-if="!showCodeForm" class="form-group">
                <button 
                    type="button"
                    @click="showCodeForm = true"
                    class="btn-toggle-code-form"
                >
                    + Dodaj kod
                </button>
            </div>
            
            <div v-if="addError" class="error-message">
                {{ addError }}
            </div>
            
            <div>
                <button type="submit" :disabled="isAdding || !newPostContent.trim()" class="btn-submit">
                    {{ isAdding ? 'Dodawanie...' : 'Dodaj post' }}
                </button>
            </div>
        </form>
        
        <!-- Pagination Controls -->
        <div v-if="totalPages > 0" class="pagination-section">
            <div class="pagination-info">
                <div>
                    <label class="page-size-label">
                        <strong>Wpisów na stronę:</strong>
                        <select v-model.number="pageSize" @change="changePageSize(pageSize)" class="page-size-select">
                            <option :value="10">10</option>
                            <option :value="20" selected>20</option>
                            <option :value="50">50</option>
                            <option :value="100">100</option>
                        </select>
                    </label>
                </div>
                <div class="page-counter">
                    <small class="pagination-text">Strona {{ currentPage }} z {{ totalPages }} (razem {{ totalPosts }} wpisów)</small>
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
                        :style="{
                            background: page === currentPage ? '#0066cc' : '#fff',
                            color: page === currentPage ? '#fff' : '#333',
                            fontWeight: page === currentPage ? 'bold' : 'normal'
                        }"
                    >
                        {{ page }}
                    </button>
                    
                    <span v-if="totalPages > 5" class="pagination-ellipsis">...</span>
                    
                    <button 
                        v-if="totalPages > 5 && currentPage > totalPages - 2"
                        @click="goToPage(totalPages)"
                        class="page-button page-button-last"
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