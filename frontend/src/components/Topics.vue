
<script setup>
import { onMounted, computed } from 'vue';
import { useTopicsStore } from '../topics';
import { useSocket } from '../socketFront';
import TopicNode from './TopicNode.vue';
import { useRouter } from 'vue-router';

const topics = useTopicsStore();
const tree = computed(() => topics.tree);
const router = useRouter();

const onSelect = (topicId) => {
    router.push(`/topics/${topicId}`);
}

onMounted(() => {
    topics.fetchTree();
});

// SOCKET: automatyczne odświeżenie drzewa tematów po aktualizacji przez socket
const { socket } = useSocket();
if (socket) {
    socket.on("topic:update", () => {
        topics.fetchTree();
    });
}
</script>

<template>
    <div>
        <TopicNode v-for="node in tree" :key="node.id" :node="node" @select="onSelect"/>
    </div>
</template>