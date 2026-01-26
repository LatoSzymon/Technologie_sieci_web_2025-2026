<script setup>
import { ref, onMounted, computed } from 'vue';
import { blockUserInTopic, unblockUserInTopic, getTopicSubtree } from '../../services/topicService';

const props = defineProps({
  topicId: { type: String, required: true },
  open: { type: Boolean, default: false }
});
const emit = defineEmits(['close', 'blocked', 'unblocked']);

const userId = ref('');
const loading = ref(false);
const error = ref('');
const mode = ref('block'); // 'block' or 'unblock'
const topicTree = ref(null);
const selectedExceptions = ref(new Set()); // Topic IDs where user CAN post (whitelist)

onMounted(async () => {
  try {
    topicTree.value = await getTopicSubtree(props.topicId);
  } catch (e) {
    console.error('Błąd pobierania drzewa tematów:', e);
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
  if (!topicTree.value) return [];
  const all = flattenTree(topicTree.value);
  return all.slice(1);
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
    selectedExceptions.value.clear();
    mode.value = 'block';
    emit('close');
  } catch (e) {
    error.value = e?.response?.data?.message || 'Błąd odblokowania';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div v-if="open" class="modal">
    <div class="modal-content">
      <h3>Zarządzaj blokami użytkownika</h3>
      <div class="modal-body">
        <div class="input-section">
          <input v-model="userId" placeholder="ID użytkownika" class="user-input" />
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

        <!-- Error message -->
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <!-- Action buttons -->
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  min-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #333;
  border-bottom: 2px solid #007bff;
  padding-bottom: 0.5rem;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.user-input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.user-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.button-group {
  display: flex;
  gap: 0.5rem;
}

.button-group button {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #ddd;
  background: #f8f9fa;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.button-group button:hover {
  border-color: #007bff;
  background: #e7f1ff;
}

.button-group button.active {
  border-color: #007bff;
  background: #007bff;
  color: #fff;
}

.button-group button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.exceptions-section {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.section-title {
  margin: 0 0 1rem 0;
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

.no-subtopics {
  padding: 1rem;
  text-align: center;
  color: #666;
  font-style: italic;
}

.subtopics-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.topic-checkbox {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.topic-checkbox:hover {
  background: rgba(0, 123, 255, 0.1);
}

.topic-checkbox input {
  cursor: pointer;
  margin-right: 0.75rem;
  width: 18px;
  height: 18px;
}

.topic-name {
  flex: 1;
  color: #333;
}

.error-message {
  padding: 0.75rem;
  background: #ffe6e6;
  border-left: 4px solid #dc3545;
  border-radius: 4px;
  color: #721c24;
  font-size: 0.9rem;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.95rem;
}

.btn-primary {
  flex: 1;
  background: #007bff;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  flex: 0.5;
  background: #e9ecef;
  color: #333;
}

.btn-secondary:hover {
  background: #dee2e6;
}
</style>
