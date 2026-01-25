<script setup>
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useTopicsStore } from '../topics';
import { storeToRefs } from 'pinia';
import { watch } from 'vue';

const route = useRoute();
const topics = useTopicsStore();
const { currentTopic, permissions, loading, error } = storeToRefs(topics);
console.log(currentTopic.value, permissions.value);


onMounted(() => {
    console.log("MOUNTED WIDOK");
    
    topics.fetchTopic(route.params.id);
});

watch(() => route.params.id, (newId) => topics.fetchTopic(newId))
</script>

<template>
    <div v-if="loading.value">
        Ładowanie...
    </div>
    <div v-else-if="error.value">
        Błąd: {{ error.value }}
    </div>
    <div v-else-if="currentTopic.value">
        <h2>{{ currentTopic.value.name }}</h2>
        <p>{{ currentTopic.value.description }}</p>
        <div v-if="permissions.value && permissions.value.canModerate">
            <span>Jesteś moderatorem w tym temacie</span>
        </div>
    </div>
    <div v-else>
        Temat nie znaleziony.
    </div>
</template>