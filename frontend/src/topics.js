import { defineStore } from "pinia";
import { ref } from "vue";
import {getTopicById, getTopicSubtree, getTopicTree} from "./services/topicService";

const useTopicsStore = defineStore("topics", () => {
    const tree = ref([]);
    const currentTopic = ref(null);
    const permissions = ref({});
    const loading = ref(false);
    const error = ref(null);

    const fetchTree = async () => {
        try {
            loading.value = true;
            error.value = null;
            tree.value = await getTopicTree();
        } catch (err) {
            error.value = err.message;
            console.error('Error fetching tree:', err);
        } finally {
            loading.value = false;
        }
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

    const fetchTopic = async (id) => {
        try {
            loading.value = true;
            error.value = null;
            console.log(`fetchuje ${id}`);
            
            const topic = await getTopicById(id);
            console.log(topic);

            currentTopic.value = topic;
            permissions.value = {}; // TODO: Oblicz permissions na podstawie topic i user
        } catch (err) {
            error.value = err.message;
            console.error('Error fetching topic:', err);
            currentTopic.value = null;
        } finally {
            loading.value = false;
        }
    };

    return {tree, currentTopic, permissions, loading, error, fetchTree, fetchSubtree, fetchTopic};
});

export {useTopicsStore};