<script setup>
const props = defineProps({ post: Object });
</script>

<template>
  <div class="post">
    <div class="author">{{ post.author }}</div>
    <div class="content" v-html="post.content"></div>
    <div class="date">{{ post.createdAt }}</div>
  </div>
</template>