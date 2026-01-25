<script setup>
import { onMounted, computed } from 'vue';
import { useTopicsStore } from '../topics';
import TopicNode from './TopicNode.vue';

const topics = useTopicsStore();
const tree = computed(() => topics.tree);

const onSelect = (topicId) => {
    topics.fetchTopic(topicId)
}

onMounted(() => {
    topics.fetchTree();
});
</script>

<template>
    <div>
        <TopicNode v-for="node in tree" :key="node.id" :node="node" @select="onSelect"/>
    </div>
</template>