
<script setup>
import { computed, ref, watch } from 'vue';
import { useTopicsStore } from '../topics';
import { authStore } from '../auth';
import api from '../services/api';
import { usePostStore } from '../posts';
import { blockUser as globalBlockUser } from '../services/adminService';
import * as postService from '../services/postService';

const props = defineProps({ post: Object });
const emit = defineEmits(['blocked', 'reply']);

const authorName = computed(() => {
  return props.post.authorId?.login || props.post.authorId?.email || 'Anonim';
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
  // In a real scenario, you'd fetch the parent post from the store or API
  // For now, we can show just the ID as a reference
  return props.post.replyTo;
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
  <div class="post">
    <div class="author">{{ authorName }}</div>
    
    <div v-if="replyToPostId" class="reply-indicator">
      <small class="reply-text">↪ W odpowiedzi na post (ID: {{ replyToPostId }})</small>
    </div>
    
    <div v-if="!isEditingPost">
      <div class="content" v-html="post.content"></div>
      
      <div v-if="post.codeBlocks && post.codeBlocks.length" class="code-blocks">
        <h4>Kody:</h4>
        <div v-for="(block, idx) in post.codeBlocks" :key="idx" class="code-block">
          <div class="code-lang">{{ block.language }}</div>
          <pre><code :class="`hljs language-${block.language}`">{{ block.code }}</code></pre>
        </div>
      </div>
    </div>
    
    <div v-else class="edit-section">
      <h4>Edytuj post</h4>
      <div class="form-group">
        <label class="form-label">
          Treść:
          <textarea v-model="editContent" class="textarea-edit"></textarea>
        </label>
      </div>
      
      <div v-if="editCodeBlocks.length" class="existing-code-blocks">
        <h5>Bloki kodu</h5>
        <div v-for="(block, idx) in editCodeBlocks" :key="`edit-${idx}`" class="code-block-edit">
          <div class="code-block-header">
            <span>{{ block.language }}</span>
            <button @click="removeCodeBlock(idx)" class="btn-remove-code">Usuń</button>
          </div>
          <pre><code>{{ block.code }}</code></pre>
        </div>
      </div>
      
      <div class="add-code-block">
        <h5>Dodaj blok kodu</h5>
        <div class="form-group">
        </div>
        <div class="form-group">
          <label class="form-label">
            Kod:
            <textarea v-model="newCodeBlock.code" class="textarea-code"></textarea>
          </label>
        </div>
        <button @click="addCodeBlock" class="btn-add-code">
          Dodaj kod
        </button>
      </div>
      
      <div v-if="editError" class="error-message">
        {{ editError }}
      </div>
      
      <button @click="savePost" :disabled="isDeleting" class="btn-save">
        {{ isDeleting ? 'Zapisywanie...' : 'Zapisz' }}
      </button>
      <button @click="cancelEdit" class="btn-cancel">
        Anuluj
      </button>
    </div>
    
    <div v-if="postTags.length > 0" class="post-tags">
      <span v-for="tag in postTags" :key="tag" class="tag-badge">
        {{ tag }}
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
          <button @click="blockUserGlobally" :disabled="isBlocking" class="btn-block-global" title="Zablokuj globalnie">🚫 Blokuj globalnie</button>
        </template>
        <button @click="emit('reply', post)" class="btn-reply">↪ Odpowiedz</button>
      </div>
      <span v-if="error" class="error-text">{{ error }}</span>
    </div>
  </div>
</template>

<style scoped>
.post {
  border: 1px solid #ddd;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 4px;
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
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
}

.code-lang {
  background: #333;
  color: #fff;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  font-weight: bold;
}

.code-block pre {
  margin: 0;
  padding: 1rem;
  overflow-x: auto;
  background: #f5f5f5;
}

.code-block code {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.code-block-edit {
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.code-block-edit pre {
  background: #f5f5f5;
  padding: 0.5rem;
  overflow-x: auto;
}

.edit-section {
  padding: 1rem;
  background: #f9f9f9;
  border: 2px solid #0066cc;
  border-radius: 4px;
  margin-bottom: 1rem;
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
</style>