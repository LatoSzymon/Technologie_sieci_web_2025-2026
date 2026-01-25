<script setup>
import { computed } from 'vue';

const props = defineProps({ post: Object });

const authorName = computed(() => {
  return props.post.authorId?.login || props.post.authorId?.email || 'Anonim';
});

const postId = computed(() => props.post._id || props.post.id);
</script>

<template>
  <div class="post">
    <div class="author">{{ authorName }}</div>
    <div class="content" v-html="post.content"></div>
    <div class="date">{{ new Date(post.createdAt).toLocaleString() }}</div>
    <div class="meta">
      <small>ID: {{ postId }}</small>
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