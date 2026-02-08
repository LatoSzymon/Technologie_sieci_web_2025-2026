<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useTopicsStore } from '../../stores/topics';
import { authStore } from '../../stores/auth';
import api from '../../services/api';

const props = defineProps({
    open: Boolean,
    topicId: String
});

const emit = defineEmits(['close', 'promoted']);

const topics = useTopicsStore();
const auth = authStore();

const selectedUserId = ref('');
const selectedUserLogin = ref('');
const allUsers = ref([]);
const loading = ref(false);
const error = ref('');
const searchQuery = ref('');
const searchInputFocused = ref(false);

const currentModerators = computed(() => {
    const topic = topics.currentTopic;
    if (!topic) return [];
    return (topic.moderatorsId || []).map(m => typeof m === 'object' ? m._id : m);
});

const filteredUsers = computed(() => {
    const currentModeratorsList = currentModerators.value;
    const topicOwner = topics.currentTopic?.ownerId?._id || topics.currentTopic?.ownerId;
    
    const available = allUsers.value.filter(u => 
        !currentModeratorsList.includes(u._id) && 
        u._id !== topicOwner
    );
    
    if (!searchQuery.value.trim()) return [];
    
    const query = searchQuery.value.toLowerCase();
    return available.filter(u => u.login.toLowerCase().includes(query)).slice(0, 10);
});

const fetchUsers = async () => {
    try {
        const response = await api.get(`/topics/${props.topicId}/eligible-users`);
        allUsers.value = response.data.users || [];
    } catch (e) {
        error.value = 'Błąd pobierania użytkowników';
        console.error(e);
    }
};

const selectUser = (user) => {
    selectedUserId.value = user._id;
    selectedUserLogin.value = user.login;
    searchQuery.value = '';
    searchInputFocused.value = false;
};

const promote = async () => {
    if (!selectedUserId.value) {
        error.value = 'Wybierz użytkownika';
        return;
    }
    
    loading.value = true;
    error.value = '';
    
    try {
        await api.post('/topics/promote-moderator', {
            topicId: props.topicId,
            userId: selectedUserId.value
        });
        
        emit('promoted');
        close();
    } catch (e) {
        error.value = e?.response?.data?.message || 'Błąd promowania moderatora';
    } finally {
        loading.value = false;
    }
};

const close = () => {
    selectedUserId.value = '';
    selectedUserLogin.value = '';
    searchQuery.value = '';
    error.value = '';
    emit('close');
};

onMounted(() => {
    if (props.open && !allUsers.value.length) {
        fetchUsers();
    }
});

watch(() => props.open, (newOpen) => {
    if (newOpen && !allUsers.value.length) {
        fetchUsers();
    }
});
</script>

<template>
    <div v-if="open" class="modal">
        <div class="modal-content">
            <h3>Promuj moderatora</h3>
            <div class="modal-body">
                <div class="input-section">
                    <label>
                        <strong>Wyszukaj użytkownika:</strong>
                    </label>
                    <div class="search-wrapper">
                        <input 
                            v-model="searchQuery"
                            @focus="searchInputFocused = true"
                            @blur="searchInputFocused = false"
                            type="text"
                            placeholder="Wpisz login użytkownika..."
                            class="user-input"
                        />
                        <div v-if="searchInputFocused && (filteredUsers.length > 0 || searchQuery.trim())">
                            <div v-if="filteredUsers.length === 0 && searchQuery.trim()">
                                Brak użytkowników pasujących do "<strong>{{ searchQuery }}</strong>"
                            </div>
                            <div 
                                v-for="user in filteredUsers"
                                :key="user._id"
                                @click="selectUser(user)"
                                @mousedown.prevent="selectUser(user)"
                            >
                                <strong>{{ user.login }}</strong>
                                <small>{{ user.email }}</small>
                            </div>
                        </div>
                    </div>
                    
                    <div v-if="selectedUserId" class="selected-user">
                        <strong>Wybrany użytkownik:</strong> {{ selectedUserLogin }}
                        <button 
                            type="button"
                            @click="selectedUserId = ''"
                            class="clear-btn"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div v-if="error" class="error-message">
                    {{ error }}
                </div>

                <div class="action-buttons">
                    <button 
                        @click="promote" 
                        :disabled="loading || !selectedUserId"
                        class="btn-primary"
                    >
                        {{ loading ? 'Promowanie...' : 'Promuj na moderatora' }}
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
    width: min(520px, 92vw);
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

.input-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.input-section label {
    color: rgb(238, 255, 0);
    font-weight: 600;
}

.search-wrapper {
    position: relative;
}

.user-input {
    padding: 10px 15px;
    border: 2px solid rgb(238, 255, 0);
    border-radius: 6px;
    font-size: 1em;
    background-color: rgba(0, 0, 0, 0.3);
    color: rgb(238, 255, 0);
    font-family: inherit;
    transition: all 0.3s ease;
    width: 100%;
    box-sizing: border-box;
}

.user-input:focus {
    outline: none;
    border-color: rgb(247, 255, 138);
    background-color: rgba(0, 0, 0, 0.5);
}

.user-input::placeholder {
    color: rgba(238, 255, 0, 0.5);
}

.search-wrapper > div {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: #000000;
    border: 1px solid rgb(238, 255, 0);
    border-top: none;
    border-radius: 0 0 6px 6px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1001;
}

.search-wrapper > div > div {
    padding: 10px 15px;
    cursor: pointer;
    border-bottom: 1px solid rgba(238, 255, 0, 0.2);
    color: rgb(238, 255, 0);
    transition: background-color 0.2s ease;
}

.search-wrapper > div > div:hover {
    background-color: rgba(238, 255, 0, 0.1);
}

.search-wrapper > div > div strong {
    color: rgb(247, 255, 138);
    display: block;
    margin-bottom: 3px;
}

.search-wrapper > div > div small {
    color: rgba(238, 255, 0, 0.6);
    font-size: 0.85em;
}

.selected-user {
    padding: 10px 12px;
    background-color: rgba(74, 222, 128, 0.1);
    border: 1px solid rgba(74, 222, 128, 0.5);
    border-radius: 6px;
    color: rgb(238, 255, 0);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.clear-btn {
    background: none;
    border: none;
    color: rgb(238, 255, 0);
    cursor: pointer;
    font-size: 1.2em;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
}

.clear-btn:hover {
    background-color: rgba(238, 255, 0, 0.1);
    transform: scale(1.1);
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

.btn-primary,
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

.btn-primary {
    flex: 1;
    background-color: #4ade80;
    color: #000000;
    border-color: #4ade80;
}

.btn-primary:hover:not(:disabled) {
    background-color: #22c55e;
    border-color: #22c55e;
    transform: scale(1.05);
}

.btn-primary:disabled {
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
