import { defineStore } from "pinia";
import { ref } from "vue";
import { getTopicById, getTopicSubtree, createTopic, listTopics } from "../services/topicService";

const useTopicsStore = defineStore("topics", () => {
    const tree = ref([]);
    const currentTopic = ref(null);
    const permissions = ref({});
    const loading = ref(false);
    const error = ref(null);
    const rootPagination = ref({ page: 1, pages: 1, total: 0, limit: 20 });

    const fetchRootPage = async ({ page = 1, limit = rootPagination.value.limit, mode = 'replace' } = {}) => {
        try {
            loading.value = true;
            error.value = null;

            const data = await listTopics({ page, limit });
            const topics = data.topics || [];

            if (mode === 'append') {
                tree.value = [...tree.value, ...topics];
            } else {
                tree.value = topics;
            }

            rootPagination.value = {
                page: data.page || page,
                pages: data.pages || Math.max(1, Math.ceil((data.total || topics.length) / limit)),
                total: data.total || topics.length,
                limit
            };

            return data;
        } catch (err) {
            error.value = err.message;
            console.error('Error fetching root page:', err);
            return { topics: [] };
        } finally {
            loading.value = false;
        }
    };

    const fetchTree = async () => {
        return fetchRootPage({ page: 1, limit: rootPagination.value.limit, mode: 'replace' });
    };

    const fetchSubtree = async (id) => {
        try {
            loading.value = true;
            error.value = null;
            tree.value = await getTopicSubtree(id);
        } catch (err) {
            error.value = err.message;
            console.error('Error fetching subtree:', err);
        } finally {
            loading.value = false;
        }
    }

    const fetchChildren = async (topicId) => {
        try {
            loading.value = true;
            error.value = null;
            const data = await listTopics({ parentId: topicId });
            return data.topics || [];
        } catch (err) {
            error.value = err.message;
            console.error('Error fetching children:', err);
            return [];
        } finally {
            loading.value = false;
        }
    };

    const refreshRoot = async () => {
        const baseLimit = rootPagination.value.limit;
        const page = rootPagination.value.page;
        const limit = baseLimit * page;

        try {
            loading.value = true;
            error.value = null;

            const data = await listTopics({ page: 1, limit });
            tree.value = data.topics || [];

            const total = data.total || tree.value.length;
            rootPagination.value = {
                ...rootPagination.value,
                total,
                pages: Math.max(1, Math.ceil(total / baseLimit))
            };
        } catch (err) {
            error.value = err.message;
            console.error('Error refreshing root topics:', err);
        } finally {
            loading.value = false;
        }
    };

    const fetchTopic = async (id) => {
        try {
            if (!id || id === 'undefined') {
                throw new Error('Invalid topic ID: ' + id);
            }
            
            loading.value = true;
            error.value = null;
            
            const topic = await getTopicById(id);
            currentTopic.value = topic;
            permissions.value = {};
        } catch (err) {
            error.value = err.message;
            console.error('Error fetching topic:', err);
            currentTopic.value = null;
        } finally {
            loading.value = false;
        }
    };

    const createTopicAction = async (topicData) => {
        try {
            loading.value = true;
            error.value = null;
            await createTopic(topicData);
            await fetchTree();
        } catch (err) {
            error.value = err.message;
            console.error('Error creating topic:', err);
            throw err;
        } finally {
            loading.value = false;
        }
    };

    return { tree, currentTopic, permissions, loading, error, rootPagination, fetchRootPage, fetchTree, fetchSubtree, fetchTopic, createTopic: createTopicAction, fetchChildren, refreshRoot };
});

export {useTopicsStore};