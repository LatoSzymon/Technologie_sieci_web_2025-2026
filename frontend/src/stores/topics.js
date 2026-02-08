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

    const normalizeTopicId = (value) => {
        if (!value) return null;
        if (typeof value === 'object') {
            return value._id || value.id || null;
        }
        return value;
    };

    const updateRootTotals = (delta) => {
        if (!delta) return;
        const baseLimit = rootPagination.value.limit || 20;
        const total = Math.max(0, (rootPagination.value.total || 0) + delta);
        rootPagination.value = {
            ...rootPagination.value,
            total,
            pages: Math.max(1, Math.ceil(total / baseLimit))
        };
    };

    const findNodeById = (nodes, topicId) => {
        const targetId = normalizeTopicId(topicId);
        if (!targetId) return null;
        for (const node of nodes || []) {
            const nodeId = normalizeTopicId(node);
            if (nodeId === targetId) return node;
            if (node.children?.length) {
                const found = findNodeById(node.children, targetId);
                if (found) return found;
            }
        }
        return null;
    };

    const updateTopicInTree = (topicPatch) => {
        const topicId = normalizeTopicId(topicPatch);
        if (!topicId) return false;
        let updated = false;
        const walk = (nodes) => {
            for (const node of nodes || []) {
                if (normalizeTopicId(node) === topicId) {
                    Object.assign(node, topicPatch);
                    updated = true;
                    return true;
                }
                if (node.children?.length && walk(node.children)) {
                    return true;
                }
            }
            return false;
        };
        walk(tree.value);
        return updated;
    };

    const upsertTopicInTree = (topic) => {
        if (!topic) return { updated: false, inserted: false };
        const updated = updateTopicInTree(topic);
        if (updated) return { updated: true, inserted: false };

        const parentId = normalizeTopicId(topic.parent);
        if (parentId) {
            const parent = findNodeById(tree.value, parentId);
            if (parent) {
                if (!Array.isArray(parent.children)) {
                    parent.children = [];
                }
                const exists = parent.children.some(child => normalizeTopicId(child) === normalizeTopicId(topic));
                if (!exists) {
                    parent.children.push(topic);
                }
                return { updated: false, inserted: true };
            }
        }

        const existsInRoot = tree.value.some(node => normalizeTopicId(node) === normalizeTopicId(topic));
        if (!existsInRoot) {
            tree.value.unshift(topic);
            updateRootTotals(1);
            return { updated: false, inserted: true };
        }

        return { updated: false, inserted: false };
    };

    const removeTopicFromTree = (topicId) => {
        const targetId = normalizeTopicId(topicId);
        if (!targetId) return false;

        let removed = false;
        const rootIndex = tree.value.findIndex(node => normalizeTopicId(node) === targetId);
        if (rootIndex !== -1) {
            tree.value.splice(rootIndex, 1);
            updateRootTotals(-1);
            removed = true;
        }

        const walk = (nodes) => {
            for (let i = (nodes?.length || 0) - 1; i >= 0; i -= 1) {
                const node = nodes[i];
                if (normalizeTopicId(node) === targetId) {
                    nodes.splice(i, 1);
                    removed = true;
                    continue;
                }
                if (node.children?.length) {
                    walk(node.children);
                }
            }
        };
        walk(tree.value);
        return removed;
    };

    const mergeCurrentTopic = (topicPatch) => {
        const topicId = normalizeTopicId(topicPatch);
        if (!topicId || !currentTopic.value) return false;
        if (normalizeTopicId(currentTopic.value) !== topicId) return false;
        currentTopic.value = { ...currentTopic.value, ...topicPatch };
        return true;
    };

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

    const fetchTopicData = async (id) => {
        if (!id || id === 'undefined') {
            throw new Error('Invalid topic ID: ' + id);
        }
        return getTopicById(id);
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

    return {
        tree,
        currentTopic,
        permissions,
        loading,
        error,
        rootPagination,
        fetchRootPage,
        fetchTree,
        fetchSubtree,
        fetchTopic,
        fetchTopicData,
        createTopic: createTopicAction,
        fetchChildren,
        refreshRoot,
        updateTopicInTree,
        upsertTopicInTree,
        removeTopicFromTree,
        mergeCurrentTopic
    };
});

export {useTopicsStore};