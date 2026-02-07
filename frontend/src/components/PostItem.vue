
<script setup>
import { computed, ref, watch } from 'vue';
import { useTopicsStore } from '../topics';
import { authStore } from '../auth';
import api from '../services/api';
import { usePostStore } from '../posts';
import { blockUser as globalBlockUser } from '../services/adminService';
import * as postService from '../services/postService';

const props = defineProps({ post: Object });
const emit = defineEmits(['blocked', 'reply', 'jump']);

const authorName = computed(() => {
  const author = props.post.authorId;
  if (typeof author === 'object' && author !== null) {
    return author.login || author.email || 'Anonim';
  }
  return 'Anonim';
});

const postId = computed(() => props.post._id || props.post.id);
const topics = useTopicsStore();
const auth = authStore();
const postStore = usePostStore();

const normalizeId = (id) => {
  if (!id) return null;
  return typeof id === 'object' ? (id._id || id.id) : id;
};

const likesCount = computed(() => props.post.likes?.length || 0);
const currentUserId = computed(() => {
  const id = auth.user?._id || auth.user?.id;
  return normalizeId(id);
});

const isOwner = computed(() => {
  const authorId = props.post.authorId?._id || props.post.authorId?.id || props.post.authorId;
  return normalizeId(authorId) === currentUserId.value;
});

const hasLiked = computed(() => {
  if (!props.post.likes || !currentUserId.value) return false;
  return props.post.likes.some(id => normalizeId(id) === currentUserId.value);
});

const canModerate = computed(() => {
  const topic = topics.currentTopic;
  const userId = auth.user?._id || auth.user?.id;
  const role = auth.user?.role;
  if (!topic || !userId) return false;
  if (role === 'admin') return true;
  const ownerId = topic.ownerId?._id || topic.ownerId;
  const isTopicOwner = ownerId && ownerId === userId;
  const moderators = (topic.moderatorsId || []).map(m => (typeof m === 'object' ? m._id : m));
  const isModerator = moderators.includes(userId);
  return isTopicOwner || isModerator;
});

const isAdmin = computed(() => {
  return auth.user?.role === 'admin';
});

const postTags = computed(() => props.post.tags || []);
const replyToPostId = computed(() => props.post.replyTo);
const replyToPost = computed(() => {
  const replyObj = props.post.replyTo;
  if (replyObj && typeof replyObj === 'object' && replyObj.content) {
    return replyObj;
  }
  return null;
});

const replyAuthorName = computed(() => {
  if (!replyToPost.value) return null;
  const author = replyToPost.value.authorId;
  if (typeof author === 'object') {
    return author.login || author.email || 'Anonim';
  }
  return 'Anonim';
});

const isBlocking = ref(false);
const isDeleting = ref(false);
const isLiking = ref(false);
const isEditingPost = ref(false);
const editContent = ref('');
const editCodeBlocks = ref([]);
const newCodeBlock = ref({ language: 'javascript', code: '' });
const error = ref('');
const editError = ref('');

const blockUserInTopic = async () => {
  isBlocking.value = true;
  error.value = '';
  try {
    const userId = props.post.authorId._id || props.post.authorId;
    await api.post(`/topics/block-user`, { topicId: topics.currentTopic._id, userId });
    emit('blocked');
  } catch (e) {
    error.value = e?.response?.data?.message || 'Błąd blokowania użytkownika w temacie';
  } finally {
    isBlocking.value = false;
  }
};

const blockUserGlobally = async () => {
  isBlocking.value = true;
  error.value = '';
  try {
    const userId = props.post.authorId._id || props.post.authorId;
    await globalBlockUser(userId);
    emit('blocked');
  } catch (e) {
    error.value = e?.response?.data?.message || 'Błąd blokowania użytkownika globalnie';
  } finally {
    isBlocking.value = false;
  }
};

const deletePost = async () => {
  isDeleting.value = true;
  error.value = '';
  try {
    await api.delete(`/posts/${postId.value}`);
    postStore.removePost(postId.value);
  } catch (e) {
    error.value = e?.response?.data?.message || 'Błąd usuwania posta';
  } finally {
    isDeleting.value = false;
  }
};

const initEditPost = () => {
  editContent.value = props.post.content;
  editCodeBlocks.value = JSON.parse(JSON.stringify(props.post.codeBlocks || []));
  newCodeBlock.value = { language: 'javascript', code: '' };
  isEditingPost.value = true;
};

const addCodeBlock = () => {
  if (newCodeBlock.value.code.trim()) {
    editCodeBlocks.value.push(JSON.parse(JSON.stringify(newCodeBlock.value)));
    newCodeBlock.value = { language: 'javascript', code: '' };
  }
};

const removeCodeBlock = (index) => {
  editCodeBlocks.value.splice(index, 1);
};

const savePost = async () => {
  if (!editContent.value.trim()) {
    editError.value = 'Treść nie może być pusta';
    return;
  }
  
  isDeleting.value = true;
  editError.value = '';
  
  try {
    await postService.updatePost(postId.value, editContent.value, editCodeBlocks.value);
    props.post.content = editContent.value;
    props.post.codeBlocks = editCodeBlocks.value;
    isEditingPost.value = false;
  } catch (e) {
    editError.value = e?.response?.data?.message || 'Błąd edycji posta';
  } finally {
    isDeleting.value = false;
  }
};

const cancelEdit = () => {
  isEditingPost.value = false;
  editContent.value = '';
  editCodeBlocks.value = [];
  editError.value = '';
};

const toggleLike = async () => {
  isLiking.value = true;
  error.value = '';
  try {
    if (hasLiked.value) {
      props.post.likes = props.post.likes.filter(id => normalizeId(id) !== currentUserId.value);
    } else {
      props.post.likes.push(currentUserId.value);
    }
    
    const response = await api.post(`/posts/${postId.value}/like`);
    console.log('Like toggled:', response.data);

    if (response.data.likes) {
      props.post.likes = response.data.likes || [];
    }
  } catch (e) {
    error.value = e?.response?.data?.message || 'Błąd like\'owania posta';
    window.location.reload();
  } finally {
    isLiking.value = false;
  }
};

</script>

<template>
  <div class="post" :id="`post-${postId}`">
    <div class="author">{{ authorName }}</div>
    
    <div v-if="replyToPost" class="reply-indicator">  
      <small class="reply-text">W odpowiedzi na post od <strong>{{ replyAuthorName }}</strong>: "{{ replyToPost.content.substring(0, 50) }}{{ replyToPost.content.length > 50 ? '...' : '' }}"</small>
      <button class="btn-jump" @click="emit('jump', replyToPost._id || replyToPost.id)">
        Przejdź
      </button>
    </div>
    
    <div v-if="!isEditingPost">
      <div class="content" v-html="post.content"></div>
      
      <div v-if="post.codeBlocks && post.codeBlocks.length" class="code-blocks">
        <div v-for="(block, idx) in post.codeBlocks" :key="idx" class="code-block">
          <div class="code-lang">{{ block.language }}</div>
          <pre><code :class="`hljs language-${block.language}`">{{ block.code }}</code></pre>
        </div>
      </div>
    </div>
    
    <div v-else class="edit-section">
      <h4 class="edit-title">Edytuj post</h4>
      <div class="edit-content-wrapper">
        <div class="form-group">
          <label class="form-label">Treść:</label>
          <textarea v-model="editContent" class="textarea-edit" placeholder="Wpisz treść posta..."></textarea>
        </div>
        
        <div v-if="editCodeBlocks.length" class="existing-code-blocks">
          <h5>Istniejące bloki kodu</h5>
          <div v-for="(block, idx) in editCodeBlocks" :key="`edit-${idx}`" class="code-block-edit">
            <div class="code-block-header">
              <span class="language-badge">{{ block.language }}</span>
              <button @click="removeCodeBlock(idx)" class="btn-remove-code" title="Usuń blok">✕</button>
            </div>
            <pre><code>{{ block.code }}</code></pre>
          </div>
        </div>
        
        <div class="add-code-block-section">
          <h5>Dodaj nowy blok kodu</h5>
          <div class="code-block-form">
            <div class="form-group">
              <label class="form-label">Język:</label>
              <select v-model="newCodeBlock.language" class="select-language">
                <option>javascript</option>
                <option>python</option>
                <option>html</option>
                <option>css</option>
                <option>java</option>
                <option>cpp</option>
                <option>csharp</option>
                <option>php</option>
                <option>ruby</option>
                <option>go</option>
                <option>rust</option>
                <option>sql</option>
                <option>bash</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Kod:</label>
              <textarea v-model="newCodeBlock.code" class="textarea-code" placeholder="Wpisz kod..."></textarea>
            </div>
            <button @click="addCodeBlock" class="btn-add-code">+ Dodaj blok kodu</button>
          </div>
        </div>
        
        <div v-if="editError" class="error-message">
          {{ editError }}
        </div>
      </div>
      
      <div class="edit-actions">
        <button @click="savePost" :disabled="isDeleting" class="btn-save">
          {{ isDeleting ? 'Zapisywanie...' : 'Zapisz zmiany' }}
        </button>
        <button @click="cancelEdit" class="btn-cancel">
          Anuluj
        </button>
      </div>
    </div>
    
    <div v-if="postTags.length > 0" class="post-tags">
      <span v-for="tag in postTags" :key="typeof tag === 'object' ? tag._id : tag" class="tag-badge">
        {{ typeof tag === 'object' ? tag.name : tag }}
      </span>
    </div>
    
    <div class="date">{{ new Date(post.createdAt).toLocaleString() }}</div>
    <div class="meta">
      <small>ID: {{ postId }}</small>
      <div class="actions">
        <button 
          @click="toggleLike" 
          :disabled="isLiking"
          class="btn-like"
          :style="{ fontWeight: hasLiked ? 'bold' : 'normal' }"
        >
          + {{ likesCount }}
        </button>
        <template v-if="isOwner">
          <button @click="initEditPost" class="btn-edit">Edytuj</button>
        </template>
        <template v-if="canModerate || isAdmin">
          <button @click="deletePost" :disabled="isDeleting" class="btn-delete">Usuń post</button>
          <button @click="blockUserInTopic" :disabled="isBlocking" class="btn-block-topic" title="Zablokuj w tym temacie">Blokuj w temacie</button>
        </template>
        <template v-if="isAdmin">
          <button @click="blockUserGlobally" :disabled="isBlocking" class="btn-block-global" title="Zablokuj globalnie">Blokuj globalnie</button>
        </template>
        <button @click="emit('reply', { post, author: authorName })" class="btn-reply">Odpowiedz</button>
      </div>
      <span v-if="error" class="error-text">{{ error }}</span>
    </div>
  </div>
</template>

<style scoped>


.post {
  border: 1px solid #44ff00;
  padding: 1rem;
  margin-bottom: 1rem;
}

.author {
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.content {
  margin-bottom: 0.5rem;
}

.code-blocks {
  margin: 1rem 0;
  border-top: 1px solid #eee;
  padding-top: 1rem;
}

.code-block {
  margin-bottom: 1rem;
  background: #322f2f;
  border-radius: 4px;
  overflow: hidden;
}

.code-lang {
  background: #333;
  color: rgb(4, 255, 0);
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  font-weight: bold;
}

.code-block pre {
  margin: 0;
  padding: 1rem;
  overflow-x: auto;
  background: #3ae601;
}

.code-block code {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.actions button {
  margin-left: 4px;
  margin-top: 4px;
  border-radius: 0;
  background-color: black;
  border: 3px solid yellow;
  color: yellow;
}

.code-block-edit {
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: yellow;
  border: 1px solid yellow;
  border-radius: 4px;
}

.code-block-edit pre {
  background: #f5f5f5;
  padding: 0.5rem;
  overflow-x: auto;
}

.edit-section {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border: 2px solid rgb(238, 255, 0);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.edit-title {
  margin: 0 0 20px 0;
  color: rgb(238, 255, 0);
  font-size: 1.2em;
  border-bottom: 2px solid rgb(238, 255, 0);
  padding-bottom: 10px;
}

.edit-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.textarea-edit,
.textarea-code,
.select-language {
  width: 100%;
  padding: 10px 12px;
  background-color: #0a0a0a;
  color: #ddd;
  border: 2px solid rgba(238, 255, 0, 0.3);
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.95em;
  box-sizing: border-box;
  transition: all 0.2s ease;
  font-family: inherit;
}

.textarea-edit:focus,
.textarea-code:focus,
.select-language:focus {
  outline: none;
  border-color: rgb(238, 255, 0);
  background-color: #1a1a1a;
  box-shadow: 0 0 8px rgba(238, 255, 0, 0.2);
}

.textarea-edit::placeholder,
.textarea-code::placeholder {
  color: rgba(238, 255, 0, 0.4);
}

.select-language option {
  background-color: #2d2d2d;
  color: #ddd;
}

.existing-code-blocks {
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(238, 255, 0, 0.2);
  border-radius: 6px;
  padding: 12px;
}

.existing-code-blocks h5 {
  margin: 0 0 12px 0;
  color: rgb(238, 255, 0);
  font-size: 0.95em;
}

.code-block-edit {
  background-color: #0a0a0a;
  border: 1px solid rgba(238, 255, 0, 0.15);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.code-block-edit:last-child {
  margin-bottom: 0;
}

.code-block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #1a1a1a;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(238, 255, 0, 0.2);
}

.language-badge {
  color: rgb(238, 255, 0);
  font-weight: bold;
  font-size: 0.85em;
  text-transform: uppercase;
}

.btn-remove-code {
  background: none;
  border: none;
  color: #ff6b6b;
  cursor: pointer;
  font-size: 1.1em;
  padding: 0 4px;
  transition: all 0.2s ease;
}

.btn-remove-code:hover {
  color: #ff4444;
  transform: scale(1.2);
}

.code-block-edit pre {
  margin: 0;
  padding: 12px;
  color: #ddd;
  font-size: 0.85em;
  overflow-x: auto;
}

.code-block-edit code {
  color: #4ade80;
}

.add-code-block-section {
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(238, 255, 0, 0.2);
  border-radius: 6px;
  padding: 12px;
}

.add-code-block-section h5 {
  margin: 0 0 12px 0;
  color: rgb(238, 255, 0);
  font-size: 0.95em;
}

.code-block-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.btn-add-code {
  padding: 10px 16px;
  background-color: #22c55e;
  color: #000;
  border: 2px solid #22c55e;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9em;
  font-family: inherit;
}

.btn-add-code:hover {
  background-color: #16a34a;
  border-color: #16a34a;
  transform: translateY(-2px);
}

.edit-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-save {
  padding: 10px 20px;
  background-color: #4ade80;
  color: #000;
  border: 2px solid #4ade80;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.95em;
  text-transform: uppercase;
  font-family: inherit;
}

.btn-save:hover:not(:disabled) {
  background-color: #22c55e;
  border-color: #22c55e;
  transform: scale(1.05);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  padding: 10px 20px;
  background-color: transparent;
  color: rgb(238, 255, 0);
  border: 2px solid rgb(238, 255, 0);
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.95em;
  text-transform: uppercase;
  font-family: inherit;
}

.btn-cancel:hover {
  background-color: rgba(238, 255, 0, 0.1);
  transform: scale(1.05);
}

.date {
  font-size: 0.85rem;
  color: #666;
}

.meta {
  font-size: 0.75rem;
  color: #999;
  margin-top: 0.5rem;
}

.tag-badge {
  color: yellow;
  background-color: rgb(0, 255, 0);
  padding: 2px;
  padding-left: 5px;
  padding-right:5px;
  border-radius: 5px;
  margin-left: 3px;
}
</style>