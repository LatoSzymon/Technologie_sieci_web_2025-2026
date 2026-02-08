
<script setup>
import { computed, ref, nextTick } from 'vue';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import { useTopicsStore } from '../stores/topics';
import { authStore } from '../stores/auth';
import api from '../services/api';
import { usePostStore } from '../stores/posts';
import { blockUser as globalBlockUser } from '../services/adminService';
import * as postService from '../services/postService';

const props = defineProps({ post: Object });
const emit = defineEmits(['blocked', 'reply', 'jump']);

const md = new MarkdownIt({
  html: false,
  linkify: true,
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  }
});

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

const renderedContent = computed(() => {
  const raw = md.render(props.post.content || '');
  const withHljs = raw
    .replace(/<pre><code class="language-/g, '<pre><code class="hljs language-')
    .replace(/<pre><code>/g, '<pre><code class="hljs">');
  return DOMPurify.sanitize(withHljs, { ADD_ATTR: ['class'] });
});

const isBlocking = ref(false);
const isDeleting = ref(false);
const isLiking = ref(false);
const isEditingPost = ref(false);
const editContent = ref('');
const editTextarea = ref(null);
const error = ref('');
const editError = ref('');
const selectedEditCodeLanguage = ref('');
const editCodeLanguages = [
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

const insertCodeBlockIntoEdit = () => {
  insertCodeBlock(editTextarea, editContent, selectedEditCodeLanguage.value);
};

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
    const topicId = topics.currentTopic?._id || topics.currentTopic?.id;
    if (topicId) {
      postStore.removePost(topicId, postId.value);
    }
  } catch (e) {
    error.value = e?.response?.data?.message || 'Błąd usuwania posta';
  } finally {
    isDeleting.value = false;
  }
};

const initEditPost = () => {
  editContent.value = props.post.content;
  isEditingPost.value = true;
};

const savePost = async () => {
  if (!editContent.value.trim()) {
    editError.value = 'Treść nie może być pusta';
    return;
  }
  
  isDeleting.value = true;
  editError.value = '';
  
  try {
    await postService.updatePost(postId.value, editContent.value);
    props.post.content = editContent.value;
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
      <div class="content" v-html="renderedContent"></div>
    </div>
    
    <div v-else class="edit-section">
      <h4 class="edit-title">Edytuj post</h4>
      <div class="edit-content-wrapper">
        <div class="form-group">
          <label class="form-label">Treść:</label>
          <div class="code-toolbar">
            <select v-model="selectedEditCodeLanguage" class="form-select-small">
              <option value="">Kod (bez jezyka)</option>
              <option v-for="lang in editCodeLanguages" :key="lang" :value="lang">
                {{ lang }}
              </option>
            </select>
            <button type="button" class="btn-edit-code" @click="insertCodeBlockIntoEdit">
              Wstaw blok kodu
            </button>
            <small class="code-help">Zaznacz fragment i kliknij, aby owinac go blokiem kodu.</small>
          </div>
          <textarea ref="editTextarea" v-model="editContent" class="textarea-edit" placeholder="Wpisz treść posta..."></textarea>
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
  border: 2px solid var(--border);
  padding: 14px;
  margin-bottom: 14px;
  background: var(--panel-2);
}

.author {
  font-weight: bold;
  margin-bottom: 6px;
  color: var(--accent);
}

.content {
  margin-bottom: 10px;
}

.actions button {
  margin: 0;
  border-radius: 4px;
  background-color: #0b0b0b;
  border: 2px solid var(--border);
  color: var(--accent);
  padding: 6px 10px;
  font-size: 0.85em;
  text-transform: uppercase;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reply-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: rgba(229, 242, 103, 0.12);
  border: 1px solid var(--border);
  padding: 8px 10px;
  margin-bottom: 10px;
}

.reply-text {
  color: var(--text);
}

.btn-jump {
  border: 2px solid var(--border);
  background: var(--accent);
  color: #000;
  padding: 6px 10px;
  font-size: 0.85em;
}

.btn-jump:hover {
  background: var(--accent-strong);
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
  color: var(--accent);
  font-size: 1.2em;
  border-bottom: 2px solid var(--border);
  padding-bottom: 10px;
}

.edit-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.textarea-edit {
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

.textarea-edit:focus {
  outline: none;
  border-color: rgb(238, 255, 0);
  background-color: #1a1a1a;
  box-shadow: 0 0 8px rgba(238, 255, 0, 0.2);
}

.textarea-edit::placeholder {
  color: rgba(238, 255, 0, 0.4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.code-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.code-help {
  color: #aaa;
  font-size: 0.85em;
}

.form-select-small {
  padding: 6px 10px;
  border: 1px solid #ffff00;
  border-radius: 4px;
  background-color: #1a1a1a;
  color: #fff;
  font-family: "Pixelify Sans", sans-serif;
}

.btn-edit-code {
  padding: 6px 10px;
  font-size: 0.9em;
  background-color: #000;
  color: var(--accent);
  border: 2px solid var(--border);
  cursor: pointer;
}

.btn-edit-code:hover {
  background-color: var(--accent);
  color: #000;
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
  color: #8e944f;
}

.meta {
  font-size: 0.75rem;
  color: #9aa07a;
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.post-tags {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
  overflow-x: auto;
  padding-bottom: 2px;
}

.tag-badge {
  color: var(--accent);
  background-color: #12331a;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-soft);
  white-space: nowrap;
}
</style>