<script setup>
import { ref } from 'vue';
import { useTopicsStore } from '../../stores/topics';
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
    <div v-if="open" class="modal">
        <div class="modal-content">
            <h3>Potwierdź usunięcie moderatora</h3>
            
            <div class="modal-body">
                <p class="confirmation-text">
                    Czy na pewno chcesz usunąć <strong>{{ moderatorLogin }}</strong> jako moderatora tego tematu?
                </p>
                
                <div v-if="error" class="error-message">
                    {{ error }}
                </div>
                
                <div class="action-buttons">
                    <button 
                        @click="remove" 
                        :disabled="loading"
                        class="btn-danger"
                    >
                        {{ loading ? 'Usuwanie...' : 'Usuń moderatora' }}
                    </button>
                    <button @click="close" class="btn-secondary">
                        Anuluj
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background-color: #000000;
    border: 2px solid rgb(238, 255, 0);
    padding: 25px;
    border-radius: 8px;
    width: min(480px, 92vw);
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

h3 {
    margin-top: 0;
    margin-bottom: 20px;
    color: rgb(238, 255, 0);
    border-bottom: 2px solid rgb(238, 255, 0);
    padding-bottom: 10px;
    font-size: 1.3em;
}

.modal-body {
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.confirmation-text {
    color: #ddd;
    font-size: 1em;
    line-height: 1.6;
    margin: 0;
}

.confirmation-text strong {
    color: rgb(238, 255, 0);
}

.error-message {
    padding: 12px;
    background-color: rgba(239, 68, 68, 0.2);
    border-left: 4px solid #ef4444;
    border-radius: 4px;
    color: #fca5a5;
    font-size: 0.9rem;
}

.action-buttons {
    display: flex;
    gap: 10px;
    margin-top: 10px;
}

.btn-danger,
.btn-secondary {
    padding: 10px 16px;
    border: 2px solid rgb(238, 255, 0);
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.95rem;
    text-transform: uppercase;
    font-family: inherit;
}

.btn-danger {
    flex: 1;
    background-color: #ef4444;
    color: #ffffff;
    border-color: #ef4444;
}

.btn-danger:hover:not(:disabled) {
    background-color: #dc2626;
    border-color: #dc2626;
    transform: scale(1.05);
}

.btn-danger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-secondary {
    flex: 0.7;
    background-color: transparent;
    color: rgb(238, 255, 0);
    border-color: rgb(238, 255, 0);
}

.btn-secondary:hover {
    background-color: rgba(238, 255, 0, 0.1);
    border-color: rgb(238, 255, 0);
}
</style>
