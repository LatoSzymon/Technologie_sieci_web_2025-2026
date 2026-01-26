
<script setup>
import { computed, inject, ref } from 'vue';
import { useTopicsStore } from '../topics';
import { authStore } from '../auth';
import api from '../services/api';
import { usePostStore } from '../posts';

const props = defineProps({ post: Object });
const emit = defineEmits(['blocked']);

const authorName = computed(() => {
  return props.post.authorId?.login || props.post.authorId?.email || 'Anonim';
});

const postId = computed(() => props.post._id || props.post.id);
const topics = useTopicsStore();
const auth = authStore();
const postStore = usePostStore();

const canModerate = computed(() => {
  // Zwraca true jeśli user może moderować ten temat
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

const isBlocking = ref(false);
const isDeleting = ref(false);
const error = ref('');

const blockUser = async () => {
  isBlocking.value = true;
  error.value = '';
  try {
    await api.post(`/topics/${topics.currentTopic._id}/block`, { userId: props.post.authorId._id || props.post.authorId });
    emit('blocked');
  } catch (e) {
    error.value = e?.response?.data?.message || 'Błąd blokowania użytkownika';
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
</script>

<template>
  <div class="post">
    <div class="author">{{ authorName }}</div>
    <div class="content" v-html="post.content"></div>
    <div class="date">{{ new Date(post.createdAt).toLocaleString() }}</div>
    <div class="meta">
      <small>ID: {{ postId }}</small>
      <template v-if="canModerate">
        <button @click="deletePost" :disabled="isDeleting" style="margin-left:1em;">Usuń post</button>
        <button @click="blockUser" :disabled="isBlocking" style="margin-left:0.5em;">Zablokuj użytkownika</button>
      </template>
      <span v-if="error" style="color:red; margin-left:1em;">{{ error }}</span>
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