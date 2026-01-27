<script setup>
import { ref } from 'vue';
import { useTopicsStore } from '../../topics';
import * as topicService from '../../services/topicService';

const props = defineProps({
    open: Boolean,
    topicId: String,
    moderatorId: String,
    moderatorLogin: String
});

const emit = defineEmits(['close', 'removed']);

const topics = useTopicsStore();
const loading = ref(false);
const error = ref('');
const remove = async () => {
    loading.value = true;
    error.value = '';
    
    try {
        await topicService.removeModerator(props.topicId, props.moderatorId);
        emit('removed');
        close();
    } catch (e) {
        error.value = e?.response?.data?.message || 'Błąd usuwania moderatora';
    } finally {
        loading.value = false;
    }
};

const close = () => {
    error.value = '';
    emit('close');
};
</script>

<template>
    <div v-if="open">
        <div>
            <h2>Potwierdź usunięcie moderatora</h2>
            
            <p>Czy na pewno chcesz usunąć <strong>{{ moderatorLogin }}</strong> jako moderatora tego tematu?</p>
            
            <div v-if="error">
                {{ error }}
            </div>
            
            <button @click="remove" :disabled="loading">
                {{ loading ? 'Usuwanie...' : 'Usuń moderatora' }}
            </button>
            <button @click="close">
                Anuluj
            </button>
        </div>
    </div>
</template>
