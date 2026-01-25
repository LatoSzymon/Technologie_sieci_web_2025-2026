import { defineStore } from "pinia";
import { ref } from "vue";
import {getTopicById, getTopicSubtree, getTopicTree} from "./services/topicService";

const useTopicsStore = defineStore("topics", () => {
    const tree = ref([]);
    const currentTopic = ref(null);
    const permissions = ref({});

    const fetchTree = async () => {
        tree.value = await getTopicTree();
    };

    const fetchSubtree = async (id) => {
        tree.value = await getTopicSubtree(id);
    }

    const fetchTopic = async (id) => {
        const {topic, permissions: perms} = await getTopicById(id);

        currentTopic.value = topic;
        permissions.value = perms;
    };

    return {tree, currentTopic, permissions, fetchTree, fetchSubtree, fetchTopic};
});

export {useTopicsStore};