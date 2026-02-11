<template>
  <div v-if="show" class="modal-backdrop">
    <div class="modal">
      <h2>{{ parentId ? 'Utwórz podtemat' : 'Utwórz nowy temat' }}</h2>
      <form @submit.prevent="submit">
        <label>Nazwa tematu:
          <input v-model="name" class="newName" required />
        </label>
        
        <label>Tagi:
          <div class="tags-selector">
            <div class="available-tags">
              <h4>Dostępne tagi:</h4>
              <div v-if="loading" class="loading">Ładuję tagi...</div>
              <div v-else-if="availableTags.length === 0" class="no-tags">
                Brak dostępnych tagów
              </div>
              <div v-else class="tag-list">
                <label v-for="tag in availableTags" :key="tag._id" class="tag-checkbox">
                  <input 
                    type="checkbox" 
                    :value="tag._id" 
                    v-model="selectedTagIds"
                  />
                  {{ tag.name }}
                </label>
              </div>
            </div>
            
            <div class="selected-tags">
              <h4>Wybrane tagi ({{ selectedTagIds.length }}):</h4>
              <div v-if="selectedTagIds.length === 0" class="no-selection">
                Nie wybrano żadnych tagów
              </div>
              <div v-else class="tag-chips">
                <span v-for="tagId in selectedTagIds" :key="tagId" class="tag-chip">
                  {{ getTagName(tagId) }}
                </span>
              </div>
            </div>
          </div>
        </label>

        <div class="buttons">
          <button type="submit">{{ parentId ? 'Utwórz podtemat' : 'Utwórz' }}</button>
          <button type="button" @click="$emit('close')">Anuluj</button>
        </div>
      </form>
      <div v-if="error" class="error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useTopicsStore } from '../stores/topics';
import tagService from '../services/tagService';
import { useSocketStore } from '../stores/socket';

const props = defineProps({
  show: Boolean,
  parentId: String
});
const emit = defineEmits(['close', 'created']);

const name = ref('');
const selectedTagIds = ref([]);
const error = ref('');
const loading = ref(false);
const availableTags = ref([]);
const topics = useTopicsStore();
const socketStore = useSocketStore();

const loadTags = async () => {
  loading.value = true;
  try {
    const tags = await tagService.getTags(props.parentId || null);
    availableTags.value = tags;
  } catch (e) {
    error.value = 'Nie udało się pobrać tagów';
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const getTagName = (tagId) => {
  return availableTags.value.find(t => t._id === tagId)?.name || 'Unknown';
};

const submit = async () => {
  error.value = '';
  try {
    const payload = {
      name: name.value,
      tags: selectedTagIds.value
    };
    
    if (props.parentId) {
      payload.parentId = props.parentId;
      const { createSubtopic } = await import('../services/topicService');
      await createSubtopic(payload);
    } else {
      await topics.createTopic(payload);
    }
    
    emit('created');
    emit('close');
    name.value = '';
    selectedTagIds.value = [];
  } catch (e) {
    error.value = e?.message || 'Błąd podczas tworzenia tematu';
  }
};

onMounted(() => {
  loadTags();
  socketStore.on('tag:created', loadTags);
  socketStore.on('tag:updated', loadTags);
  socketStore.on('tag:deleted', loadTags);
});

onBeforeUnmount(() => {
  socketStore.off('tag:created', loadTags);
  socketStore.off('tag:updated', loadTags);
  socketStore.off('tag:deleted', loadTags);
});
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: #302c2ceb;
  padding: 20px;
  border-radius: 8px;
  width: min(720px, 92vw);
  max-height: 90vh;
  overflow-y: auto;
}
.tags-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1em;
  margin-top: 0.5em;
  border: 2px solid var(--border);
  padding: 1em;
  width: 100%;
}
.available-tags, .selected-tags {
  display: flex;
  flex-direction: column;
}
.available-tags h4, .selected-tags h4 {
  margin: 0 0 0.5em 0;
  font-size: 0.9em;
  color: var(--text-soft);
}

.newName {
  width: 100%;
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  max-height: 300px;
  overflow-y: auto;
}
.tag-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5em;
  cursor: pointer;
  padding: 0.25em;
  border-radius: 3px;
}

.tag-checkbox input {
  cursor: pointer;
  margin: none;
  padding: none;
}
.tag-chips {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.5em;
  overflow-x: auto;
  padding-bottom: 2px;
}
.tag-chip {
  background: #12331a;
  color: var(--accent);
  padding: 0.25em 0.75em;
  border-radius: 20px;
  font-size: 0.9em;
  border: 1px solid var(--border-soft);
  white-space: nowrap;
}
.no-tags, .no-selection, .loading {
  color: #999;
  font-style: italic;
  padding: 0.5em;
}
.buttons {
  display: flex;
  gap: 0.5em;
  margin-top: 1em;
}
button {
  flex: 1;
  padding: 0.5em;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: var(--accent);
  color: rgb(0, 0, 0);
}

@media (max-width: 720px) {
  .tags-selector {
    grid-template-columns: 1fr;
  }
}

.error {
  color: red;
  margin-top: 1em;
}
</style>
