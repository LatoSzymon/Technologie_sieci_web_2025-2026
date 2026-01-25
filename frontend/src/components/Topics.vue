
<script setup>
import { onMounted, computed } from 'vue';
import { useTopicsStore } from '../topics';
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

// const { socket } = useSocket();
// if (socket) {
//     socket.on("topic:update", () => {
//         topics.fetchTree();
//     });
// }
</script>

<template>
    <div>
        <TopicNode v-for="node in tree" :key="node.id" :node="node" @select="onSelect"/>
    </div>
</template>