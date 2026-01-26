
<script setup>
import { computed, inject, ref } from 'vue';
import { useTopicsStore } from '../topics';
import { authStore } from '../auth';
import api from '../services/api';
import { usePostStore } from '../posts';
import { blockUser as globalBlockUser } from '../services/adminService';

const props = defineProps({ post: Object });
const emit = defineEmits(['blocked']);

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
  const isOwner = ownerId && ownerId === userId;
  const moderators = (topic.moderatorsId || []).map(m => (typeof m === 'object' ? m._id : m));
  const isModerator = moderators.includes(userId);
  return isOwner || isModerator;
});

const isAdmin = computed(() => {
  return auth.user?.role === 'admin';
});

const isBlocking = ref(false);
const isDeleting = ref(false);
const isLiking = ref(false);
const error = ref('');

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
    <div class="content" v-html="post.content"></div>
    <div class="date">{{ new Date(post.createdAt).toLocaleString() }}</div>
    <div class="meta">
      <small>ID: {{ postId }}</small>
      <div style="margin-top: 0.5rem;">
        <button 
          @click="toggleLike" 
          :disabled="isLiking"
          :style="{ fontWeight: hasLiked ? 'bold' : 'normal' }"
        >
          + {{ likesCount }}
        </button>
        <template v-if="canModerate || isAdmin">
          <button @click="deletePost" :disabled="isDeleting" style="margin-left:1em;">Usuń post</button>
          <button @click="blockUserInTopic" :disabled="isBlocking" style="margin-left:0.5em;" title="Zablokuj w tym temacie">Blokuj w temacie</button>
        </template>
        <template v-if="isAdmin">
          <button @click="blockUserGlobally" :disabled="isBlocking" style="margin-left:0.5em; background: #dc3545;" title="Zablokuj globalnie">🚫 Blokuj globalnie</button>
        </template>
      </div>
      <span v-if="error" style="color:red; margin-top:0.5rem; display:block;">{{ error }}</span>
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