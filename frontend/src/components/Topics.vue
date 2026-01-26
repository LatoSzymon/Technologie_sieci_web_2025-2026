
<script setup>


import { onMounted, computed, ref } from 'vue';
import { useTopicsStore } from '../topics';
import TopicNode from './TopicNode.vue';
import CreateTopicModal from './CreateTopicModal.vue';
import { useRouter } from 'vue-router';
import tagService from '../services/tagService';

const topics = useTopicsStore();
const tree = computed(() => topics.tree);
const router = useRouter();

const showCreateModal = ref(false);
const search = ref('');

const tagFilter = ref('');
const allTags = ref([]);

const filteredTree = computed(() => {
    function filterNodes(nodes) {
        return (nodes || []).filter(node => {
            const matchesSearch = !search.value || node.name.toLowerCase().includes(search.value.toLowerCase());
            const matchesTag = !tagFilter.value || (node.tags || []).includes(tagFilter.value);
            const filteredChildren = filterNodes(node.children || []);
            return (matchesSearch && matchesTag) || filteredChildren.length > 0;
        }).map(node => ({
            ...node,
            children: filterNodes(node.children || [])
        }));
    }
    return filterNodes(tree.value);
});

const onSelect = (topicId) => {
        router.push(`/topics/${topicId}`);
}

const handleCreated = () => {
        topics.fetchTree();
};


onMounted(async () => {
        await topics.fetchTree();
        try {
            allTags.value = await tagService.getTags();
        } catch (e) {
            allTags.value = [];
        }
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
        <div style="margin-bottom:1em;">
            <input v-model="search" placeholder="Szukaj tematu..." style="margin-right:1em;" />
            <select v-model="tagFilter">
                <option value="">Wszystkie tagi</option>
                <option v-for="tag in allTags" :key="tag._id || tag.name || tag" :value="tag.name || tag">{{ tag.name || tag }}</option>
            </select>
        </div>
        <button @click="showCreateModal = true">Utwórz nowy temat</button>
        <CreateTopicModal :show="showCreateModal" @close="showCreateModal = false" @created="handleCreated" />
        <TopicNode v-for="node in filteredTree" :key="node.id" :node="node" @select="onSelect"/>
    </div>
</template>