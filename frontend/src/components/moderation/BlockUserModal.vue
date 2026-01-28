<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { blockUserInTopic, unblockUserInTopic, getTopicSubtree } from '../../services/topicService';
import api from '../../services/api';

const props = defineProps({
  topicId: { type: String, required: true },
  open: { type: Boolean, default: false }
});
const emit = defineEmits(['close', 'blocked', 'unblocked']);

const userId = ref('');
const loading = ref(false);
const error = ref('');
const mode = ref('block');
const topicTree = ref(null);
const selectedExceptions = ref(new Set());
const allUsers = ref([]);
const searchQuery = ref('');
const searchInputFocused = ref(false);

const loadTopicData = async () => {
  if (!props.topicId) {
    console.log('topicId nie został jeszcze ustawiony');
    return;
  }
  
  try {
    const treeData = await getTopicSubtree(props.topicId);
    console.log('Pobrane drzewo podtematów:', treeData);
    topicTree.value = treeData;
    const response = await api.get('/admin/all-users');
    allUsers.value = response.data.users || [];
    console.log('Pobrani użytkownicy:', allUsers.value.length);
  } catch (e) {
    console.error('Błąd pobierania danych:', e);
    error.value = 'Błąd pobierania danych tematu';
  }
};

onMounted(async () => {
  await loadTopicData();
});

watch(() => props.topicId, async (newTopicId) => {
  if (newTopicId) {
    topicTree.value = null;
    selectedExceptions.value.clear();
    await loadTopicData();
  }
});

const flattenTree = (node, flat = []) => {
  if (!node) return flat;
  flat.push(node);
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      flattenTree(child, flat);
    }
  }
  return flat;
};

const subtopics = computed(() => {
  if (!topicTree.value) {
    console.log('topicTree.value jest nullowy/undefined');
    return [];
  }
  const all = flattenTree(topicTree.value);
  console.log('Spłaszczone drzewo:', all.length, 'elementów, podtematy:', all.length - 1);
  return all.slice(1);
});

const filteredUsers = computed(() => {
  if (!searchQuery.value.trim()) return [];
  const query = searchQuery.value.toLowerCase();
  return allUsers.value.filter(u => u.login.toLowerCase().includes(query)).slice(0, 10);
});

const toggleException = (topicId) => {
  if (selectedExceptions.value.has(topicId)) {
    selectedExceptions.value.delete(topicId);
  } else {
    selectedExceptions.value.add(topicId);
  }
};

const blockUser = async () => {
  if (!userId.value) return;
  loading.value = true;
  error.value = '';
  try {
    const exceptions = Array.from(selectedExceptions.value);
    await blockUserInTopic({ topicId: props.topicId, userId: userId.value, exceptTopicIds: exceptions });
    emit('blocked', userId.value);
    userId.value = '';
    searchQuery.value = '';
    selectedExceptions.value.clear();
    mode.value = 'block';
    emit('close');
  } catch (e) {
    error.value = e?.response?.data?.message || 'Błąd blokowania';
  } finally {
    loading.value = false;
  }
};

const unblockUser = async () => {
  if (!userId.value) return;
  loading.value = true;
  error.value = '';
  try {
    await unblockUserInTopic({ topicId: props.topicId, userId: userId.value });
    emit('unblocked', userId.value);
    userId.value = '';
    searchQuery.value = '';
    selectedExceptions.value.clear();
    mode.value = 'block';
    emit('close');
  } catch (e) {
    error.value = e?.response?.data?.message || 'Błąd odblokowania';
  } finally {
    loading.value = false;
  }
};

const selectUser = (user) => {
  userId.value = user._id;
  searchQuery.value = '';
};
</script>

<template>
  <div v-if="open" class="modal">
    <div class="modal-content">
      <h3>Zarządzaj blokami użytkownika</h3>
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
          
          <div v-if="userId">
            <strong>Wybrany użytkownik:</strong> {{ userId }}
            <button 
              type="button"
              @click="userId = ''"
            >
              ✕
            </button>
          </div>
          
          <div class="button-group">
            <button 
              :disabled="loading || !userId" 
              @click="mode = 'block'"
              :class="{ active: mode === 'block' }"
            >
              Zablokuj
            </button>
            <button 
              :disabled="loading || !userId" 
              @click="mode = 'unblock'"
              :class="{ active: mode === 'unblock' }"
            >
              Odblokuj
            </button>
          </div>
        </div>

        <div v-if="mode === 'block'" class="exceptions-section">
          <p class="section-title">Wybierz podtematy gdzie użytkownik BĘDZIE mieć dostęp:</p>
          <div v-if="subtopics.length === 0" class="no-subtopics">
            Brak podtematów w tym temacie
          </div>
          <div v-else class="subtopics-list">
            <label v-for="topic in subtopics" :key="topic._id" class="topic-checkbox">
              <input 
                type="checkbox"
                :checked="selectedExceptions.has(topic._id)"
                @change="toggleException(topic._id)"
              />
              <span class="topic-name">{{ topic.name }}</span>
            </label>
          </div>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div class="action-buttons">
          <button 
            v-if="mode === 'block'"
            :disabled="loading || !userId" 
            @click="blockUser"
            class="btn-primary"
          >
            {{ loading ? 'Blokowanie...' : 'Zablokuj użytkownika' }}
          </button>
          <button 
            v-else
            :disabled="loading || !userId" 
            @click="unblockUser"
            class="btn-primary"
          >
            {{ loading ? 'Odblokowywanie...' : 'Odblokuj użytkownika' }}
          </button>
          <button @click="$emit('close')" class="btn-secondary">
            Zamknij
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
  min-width: 420px;
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

.button-group {
  display: flex;
  gap: 8px;
}

.button-group button {
  flex: 1;
  padding: 10px 15px;
  border: 2px solid rgb(238, 255, 0);
  background-color: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  color: rgb(238, 255, 0);
  transition: all 0.3s ease;
  text-transform: uppercase;
  font-size: 0.9em;
  font-family: inherit;
}

.button-group button:hover:not(:disabled) {
  background-color: rgba(74, 222, 128, 0.1);
  border-color: #4ade80;
  color: #4ade80;
}

.button-group button.active {
  border-color: #4ade80;
  background-color: #4ade80;
  color: #000000;
}

.button-group button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.exceptions-section {
  padding: 15px;
  background-color: rgba(238, 255, 0, 0.05);
  border: 1px solid rgba(238, 255, 0, 0.2);
  border-radius: 6px;
}

.section-title {
  margin: 0 0 12px 0;
  font-weight: 600;
  color: rgb(238, 255, 0);
  font-size: 0.95rem;
}

.no-subtopics {
  padding: 15px;
  text-align: center;
  color: rgba(238, 255, 0, 0.6);
  font-style: italic;
}

.subtopics-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.topic-checkbox {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
  color: rgb(238, 255, 0);
  transition: all 0.2s ease;
  font-size: 0.9em;
}

.topic-checkbox:hover {
  background-color: rgba(74, 222, 128, 0.15);
}

.topic-checkbox input {
  cursor: pointer;
  margin-right: 8px;
  width: 16px;
  height: 16px;
  accent-color: #4ade80;
  flex-shrink: 0;
}

.topic-name {
  flex: 1;
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
