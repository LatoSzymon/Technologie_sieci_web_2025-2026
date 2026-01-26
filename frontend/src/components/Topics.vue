
<script setup>

import { onMounted, computed, ref } from 'vue';
import { useTopicsStore } from '../topics';
import TopicNode from './TopicNode.vue';
import CreateTopicModal from './CreateTopicModal.vue';
import { useRouter } from 'vue-router';

const topics = useTopicsStore();
const tree = computed(() => topics.tree);
const router = useRouter();

const showCreateModal = ref(false);

const onSelect = (topicId) => {
    router.push(`/topics/${topicId}`);
}

const handleCreated = () => {
    topics.fetchTree();
};

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
        <button @click="showCreateModal = true">Utwórz nowy temat</button>
        <CreateTopicModal :show="showCreateModal" @close="showCreateModal = false" @created="handleCreated" />
        <TopicNode v-for="node in tree" :key="node.id" :node="node" @select="onSelect"/>
    </div>
</template>