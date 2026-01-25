<script setup>
import { postStore } from '../posts';
import { fetchPosts } from '../services/postService';
import { onMounted, watch } from 'vue';
import PostItem from './PostItem.vue';
import Pagination from './Pagination.vue';


const props = defineProps({topicId: Number});

const {posts, page, totalPages} = postStore;

const load = async (pageNumber = 1) => {
    const data = await fetchPosts(props.topicId, pageNumber);
    postStore.setPosts({...data, topicId: props.topicId});
}

onMounted(() => load(postStore.lastReadPage[props.topicId] || 1));
watch(() => props.topicId, () => load(1));

const changePage = (newPage) => {
    load(newPage)
}
</script>

<template>
    <div>
        <PostItem v-for="post in posts" :key="post.id" :post="post"/>
        <Pagination :page="page" :totalPages="totalPages" @change="changePage" />
    </div>
</template>