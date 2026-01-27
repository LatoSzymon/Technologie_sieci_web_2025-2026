<script setup>
import { ref, computed, onMounted } from 'vue';
import { useTopicsStore } from '../../topics';
import { authStore } from '../../auth';
import api from '../../services/api';

const props = defineProps({
    open: Boolean,
    topicId: String
});

const emit = defineEmits(['close', 'promoted']);

const topics = useTopicsStore();
const auth = authStore();

const selectedUserId = ref('');
const allUsers = ref([]);
const loading = ref(false);
const error = ref('');
const searchQuery = ref('');

const currentModerators = computed(() => {
    const topic = topics.currentTopic;
    if (!topic) return [];
    return (topic.moderatorsId || []).map(m => typeof m === 'object' ? m._id : m);
});

const availableUsers = computed(() => {
    const filtered = allUsers.value.filter(u => 
        !currentModerators.value.includes(u._id) && 
        u._id !== (topics.currentTopic.ownerId._id || topics.currentTopic.ownerId)
    );
    
    if (!searchQuery.value.trim()) return filtered;
    
    const query = searchQuery.value.toLowerCase();
    return filtered.filter(u => u.login.toLowerCase().includes(query));
});

const fetchUsers = async () => {
    try {
        const response = await api.get('/admin/all-users');
        allUsers.value = response.data.users || [];
    } catch (e) {
        error.value = 'Błąd pobierania użytkowników';
        console.error(e);
    }
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
    error.value = '';
    emit('close');
};

onMounted(() => {
    if (props.open && !allUsers.value.length) {
        fetchUsers();
    }
});
</script>

<template>
    <div v-if="open">
        <div>
            <h2>Promuj moderatora</h2>
            
            <div>
                <label>
                    <strong>Wyszukaj użytkownika:</strong>
                    <input 
                        v-model="searchQuery"
                        type="text"
                        placeholder="Wpisz login użytkownika..."
                    />
                </label>
            </div>
            
            <div v-if="availableUsers.length > 0">
                <div 
                    v-for="user in availableUsers" 
                    :key="user._id"
                    @click="selectedUserId = user._id"
                >
                    <strong>{{ user.login }}</strong>
                    <small>{{ user.email }}</small>
                </div>
            </div>
            
            <div v-else-if="searchQuery.trim()">
                Brak użytkowników pasujących do wyszukiwania
            </div>
            
            <div v-else-if="allUsers.length === 0">
                Ładowanie użytkowników...
            </div>
            
            <div v-if="error">
                {{ error }}
            </div>
            
            <button 
                @click="promote" 
                :disabled="loading || !selectedUserId"
            >
                {{ loading ? 'Promowanie...' : 'Promuj' }}
            </button>
            <button @click="close">
                Anuluj
            </button>
        </div>
    </div>
</template>
