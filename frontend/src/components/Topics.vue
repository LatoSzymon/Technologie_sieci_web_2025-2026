
<script setup>


import { onMounted, onBeforeUnmount, computed, ref } from 'vue';
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
const sentinel = ref(null);
const currentPage = ref(1);
const totalPages = ref(1);
const isLoadingMore = ref(false);
const pageSize = 15;
let observer = null;

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

const handleCreated = async () => {
        await loadFirstPage();
};

const handleRefresh = async () => {
        await loadFirstPage();
};

const loadFirstPage = async () => {
        const data = await topics.fetchRootPage({ page: 1, limit: pageSize, mode: 'replace' });
        currentPage.value = data.page || 1;
        totalPages.value = data.pages || 1;
};

const loadMore = async () => {
        if (isLoadingMore.value || currentPage.value >= totalPages.value) return;

        isLoadingMore.value = true;
        try {
            const nextPage = currentPage.value + 1;
            const data = await topics.fetchRootPage({ page: nextPage, limit: pageSize, mode: 'append' });
            currentPage.value = data.page || nextPage;
            totalPages.value = data.pages || totalPages.value;
        } finally {
            isLoadingMore.value = false;
        }
};

onMounted(async () => {
        await loadFirstPage();
        try {
            allTags.value = await tagService.getTags();
        } catch (e) {
            allTags.value = [];
        }

        observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    loadMore();
                }
            },
            { root: null, rootMargin: '200px', threshold: 0.1 }
        );

        if (sentinel.value) {
            observer.observe(sentinel.value);
        }
});

onBeforeUnmount(() => {
        if (observer) {
            observer.disconnect();
            observer = null;
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
        <div ref="sentinel" class="topics-sentinel"></div>
        <div v-if="isLoadingMore" class="topics-loading">Ladowanie kolejnych tematow...</div>
    </div>
</template>

<style scoped>
    .topics-container {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-width: 1200px;
        margin: 0 auto;
    }

    .search-section {
        margin: 0;
        padding: 14px;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        align-items: center;
        background: var(--panel);
        border: 2px solid var(--border);
    }

    input {
        padding: 10px 12px;
        min-width: min(320px, 100%);
        border: 2px solid var(--border);
        border-radius: 4px;
        font-family: "Pixelify Sans", sans-serif;
        background: #0e0e0e;
        color: var(--text);
    }

    select {
        padding: 10px 12px;
        border: 2px solid var(--border);
        border-radius: 4px;
        font-family: "Pixelify Sans", sans-serif;
        background: #0e0e0e;
        color: var(--text);
        min-width: 220px;
    }

    .create-btn {
        margin: 0;
        padding: 10px 16px;
        border: 2px solid var(--border);
        border-radius: 4px;
        font-family: "Pixelify Sans", sans-serif;
        cursor: pointer;
        background-color: var(--accent);
        font-weight: bold;
        align-self: flex-start;
    }

    .create-btn:hover {
        background-color: var(--accent-strong);
    }

    .topics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 18px;
        margin-top: 6px;
        width: 100%;
        flex: 1;
    }

    .topics-sentinel {
        height: 1px;
        width: 100%;
    }

    .topics-loading {
        color: var(--accent);
        text-align: center;
        margin: 16px 0;
    }

    @media (max-width: 1200px) {
        .topics-grid {
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        }
    }

    @media (max-width: 768px) {
        .topics-grid {
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        }
    }

    @media (max-width: 480px) {
        .topics-grid {
            grid-template-columns: 1fr;
        }
    }
</style>