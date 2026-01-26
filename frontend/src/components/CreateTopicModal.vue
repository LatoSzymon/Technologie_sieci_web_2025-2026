<template>
  <div v-if="show" class="modal-backdrop">
    <div class="modal">
      <h2>Utwórz nowy temat</h2>
      <form @submit.prevent="submit">
        <label>Nazwa tematu:
          <input v-model="name" required />
        </label>
        
        <label>Tagi (wybierz):
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
          <button type="submit">Utwórz</button>
          <button type="button" @click="$emit('close')">Anuluj</button>
        </div>
      </form>
      <div v-if="error" class="error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useTopicsStore } from '../topics';
import tagService from '../services/tagService';

const props = defineProps({
  show: Boolean
});
const emit = defineEmits(['close', 'created']);

const name = ref('');
const selectedTagIds = ref([]);
const error = ref('');
const loading = ref(false);
const availableTags = ref([]);
const topics = useTopicsStore();

const loadTags = async () => {
  loading.value = true;
  try {
    const tags = await tagService.getTags();
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
    await topics.createTopic({
      name: name.value,
      tags: selectedTagIds.value
    });
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
});
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: #fff;
  padding: 2em;
  border-radius: 8px;
  min-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
}
.tags-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1em;
  margin-top: 0.5em;
  border: 1px solid #ddd;
  padding: 1em;
  border-radius: 4px;
}
.available-tags, .selected-tags {
  display: flex;
  flex-direction: column;
}
.available-tags h4, .selected-tags h4 {
  margin: 0 0 0.5em 0;
  font-size: 0.9em;
  color: #666;
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
.tag-checkbox:hover {
  background: #f5f5f5;
}
.tag-checkbox input {
  cursor: pointer;
}
.tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
}
.tag-chip {
  background: #007bff;
  color: white;
  padding: 0.25em 0.75em;
  border-radius: 20px;
  font-size: 0.9em;
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
  background: #007bff;
  color: white;
}
button:hover {
  background: #0056b3;
}
button[type="button"] {
  background: #6c757d;
}
button[type="button"]:hover {
  background: #5a6268;
}
.error {
  color: red;
  margin-top: 1em;
}
</style>
