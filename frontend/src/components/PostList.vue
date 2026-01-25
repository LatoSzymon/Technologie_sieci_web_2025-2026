
<script setup>
import { postStore } from '../posts';
import { fetchPosts } from '../services/postService';
import api from '../services/api';
import { ref, onMounted, watch } from 'vue';
import { useSocket } from '../socketFront';
import PostItem from './PostItem.vue';
import Pagination from './Pagination.vue';

const props = defineProps({ topicId: Number });

const newPostContent = ref("");
const isAdding = ref(false);
const addError = ref("");

const load = async (pageNumber = 1) => {
    const data = await fetchPosts(props.topicId, pageNumber);
    // Mapuj 'pages' z backendu na 'totalPages' dla postStore
    postStore.setPosts({
        ...data,
        totalPages: data.pages,
        topicId: props.topicId
    });
}

onMounted(() => load(postStore.lastReadPage[props.topicId] || 1));
watch(() => props.topicId, () => load(1));


const changePage = (newPage) => {
    // Walidacja zakresu stron
    if (newPage < 1 || newPage > postStore.totalPages) return;
    load(newPage);
}


const { socket } = useSocket();
if (socket) {
    socket.on("post:new", (post) => {
        if (post.topicId === props.topicId) {
            // Jeśli jesteśmy na ostatniej stronie, dodaj post natychmiast
            if (postStore.page === postStore.totalPages) {
                postStore.addPost(post);
                // Aktualizuj licznik postów i stron jeśli trzeba
                postStore.posts = postStore.posts.slice(0, 10); // Załóżmy 10 postów na stronę
                // Jeśli przekroczono limit, zwiększ totalPages
                if (postStore.posts.length === 10 && postStore.totalPages * 10 <= postStore.posts.length) {
                    postStore.totalPages += 1;
                }
            }
            // Jeśli nie, możesz dodać notyfikację lub nic nie robić
        }
    });
}

const addPost = async () => {
    if (!newPostContent.value.trim()) return;
    isAdding.value = true;
    addError.value = "";
    try {
        await api.post('/posts', {
            topicId: props.topicId,
            content: newPostContent.value
        });
        newPostContent.value = "";
        // Post pojawi się automatycznie przez socket
    } catch (err) {
        addError.value = err?.response?.data?.message || 'Błąd dodawania posta';
    } finally {
        isAdding.value = false;
    }
}
</script>

<template>
    <div>
        <!-- Formularz dodawania nowego posta -->
        <form @submit.prevent="addPost" style="margin-bottom: 1em;">
            <textarea v-model="newPostContent" rows="3" style="width:100%" placeholder="Napisz nowy post..." :disabled="isAdding"></textarea>
            <div>
                <button type="submit" :disabled="isAdding || !newPostContent.trim()">Dodaj post</button>
                <span v-if="addError" style="color:red; margin-left:1em;">{{ addError }}</span>
            </div>
        </form>

        <PostItem v-for="post in postStore.posts" :key="post.id" :post="post"/>
        <Pagination :page="postStore.page" :totalPages="postStore.totalPages" @change="changePage" />
    </div>
</template>