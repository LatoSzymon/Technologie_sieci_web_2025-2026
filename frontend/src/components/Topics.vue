
<script setup>


import { onMounted, computed, ref } from 'vue';
import { useTopicsStore } from '../stores/topics';
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

const handleRefresh = () => {
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
    <div class="topics-container">
        <div class="search-section">
            <input v-model="search" placeholder="Szukaj tematu..." class="search-input" />
            <select v-model="tagFilter" class="tag-filter">
                <option value="">Wszystkie tagi</option>
                <option v-for="tag in allTags" :key="tag._id" :value="tag._id">{{ tag.name }}</option>
            </select>
        </div>
        <button @click="showCreateModal = true" class="create-btn">Utwórz nowy temat</button>
        <CreateTopicModal :show="showCreateModal" @close="showCreateModal = false" @created="handleCreated" />
        <div class="topics-grid">
            <TopicNode v-for="node in filteredTree" :key="node._id" :node="node" @select="onSelect" @refresh="handleRefresh"/>
        </div>
    </div>
</template>

<style scoped>
    .topics-container {
        padding: 20px;
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }

    .search-section {
        margin: 20px 0;
        padding: 15px;
        display: flex;
        gap: 15px;
        flex-wrap: wrap;
    }

    input {
        padding: 10px;
        min-width: 20vw;
        border: 2px solid yellow;
        border-radius: 5px;
        font-family: "Pixelify Sans", sans-serif;
    }

    select {
        padding: 10px;
        border: 2px solid yellow;
        border-radius: 5px;
        font-family: "Pixelify Sans", sans-serif;
    }

    .create-btn {
        margin: 20px 0;
        padding: 10px 20px;
        border: 2px solid yellow;
        border-radius: 5px;
        font-family: "Pixelify Sans", sans-serif;
        cursor: pointer;
        background-color: #ffff00;
        font-weight: bold;
    }

    .create-btn:hover {
        background-color: #ffffcc;
    }

    .topics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 20px;
        margin-top: 20px;
        width: 100%;
        flex: 1;
    }

    @media (max-width: 1200px) {
        .topics-grid {
            grid-template-columns: repeat(3, 1fr);
        }
    }

    @media (max-width: 768px) {
        .topics-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 480px) {
        .topics-grid {
            grid-template-columns: 1fr;
        }
    }
</style>