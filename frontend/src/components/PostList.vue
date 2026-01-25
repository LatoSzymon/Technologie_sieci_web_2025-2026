
<script setup>
import { usePostStore } from '../posts';
import { useSocketStore } from '../stores/socket';
import { fetchPosts } from '../services/postService';
import api from '../services/api';
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import PostItem from './PostItem.vue';

const props = defineProps({ 
    topicId: String 
});

const postStore = usePostStore();
const socketStore = useSocketStore();

const newPostContent = ref("");
const isAdding = ref(false);
const addError = ref("");

const load = async () => {
    try {
        const data = await fetchPosts(props.topicId);
        postStore.setPosts({ posts: data.posts || [] });
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
        console.log('Topic matches!');
        postStore.addPost(post);
        console.log(' Post added to store');
    } else {
        console.log(' Topic does not match, ignoring post');
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
        const response = await api.post('/posts', {
            topicId: props.topicId,
            content: newPostContent.value
        });
        console.log('Post created successfully:', response.data);
        newPostContent.value = "";
    } catch (err) {
        console.error('Error creating post:', err);
        addError.value = err?.response?.data?.message || 'Błąd dodawania posta';
    } finally {
        isAdding.value = false;
    }
}
</script>

<template>
    <div>
        <form @submit.prevent="addPost" style="margin-bottom: 1em;">
            <textarea v-model="newPostContent" rows="3" style="width:100%" placeholder="Napisz nowy post..." :disabled="isAdding"></textarea>
            <div>
                <button type="submit" :disabled="isAdding || !newPostContent.trim()">Dodaj post</button>
                <span v-if="addError" style="color:red; margin-left:1em;">{{ addError }}</span>
            </div>
        </form>

        <PostItem v-for="post in postStore.posts" :key="post._id || post.id" :post="post"/>
    </div>
</template>