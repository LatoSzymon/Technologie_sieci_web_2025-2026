
<script setup>


import { onMounted, computed, ref } from 'vue';
import { useTopicsStore } from '../topics';
import TopicNode from './TopicNode.vue';
import CreateTopicModal from './CreateTopicModal.vue';
import { useRouter } from 'vue-router';
import tagService from '../services/tagService';

const topics = useTopicsStore();
const tree = computed(() => {
    return topics.tree;
});
const router = useRouter();

const showCreateModal = ref(false);
const search = ref('');

const tagFilter = ref('');
const allTags = ref([]);

const filteredTree = computed(() => {
    function filterNodes(nodes) {
        return (nodes || []).filter(node => {
            const matchesSearch = !search.value || node.name.toLowerCase().includes(search.value.toLowerCase());
            const matchesTag = !tagFilter.value || (node.tags || []).some(tag => {
                const tagId = typeof tag === 'object' ? tag._id : tag;
                return tagId === tagFilter.value;
            });
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

</script>

<template>
    <div>
        <div class="search-section">
            <input v-model="search" placeholder="Szukaj tematu..." class="search-input" />
            <select v-model="tagFilter" class="tag-filter">
                <option value="">Wszystkie tagi</option>
                <option v-for="tag in allTags" :key="tag._id" :value="tag._id">{{ tag.name }}</option>
            </select>
        </div>
        <button @click="showCreateModal = true">Utwórz nowy temat</button>
        <CreateTopicModal :show="showCreateModal" @close="showCreateModal = false" @created="handleCreated" />
        <TopicNode v-for="node in filteredTree" :key="node._id" :node="node" @select="onSelect"/>
    </div>
</template>