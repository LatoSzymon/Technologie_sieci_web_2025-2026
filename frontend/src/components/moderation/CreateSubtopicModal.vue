<script setup>
import { ref } from 'vue';
import { createSubtopic } from '../../services/topicService';

const props = defineProps({
  parentId: { type: String, required: true },
  open: { type: Boolean, default: false }
});
const emit = defineEmits(['close', 'created']);

const name = ref('');
const description = ref('');
const tags = ref('');
const loading = ref(false);
const error = ref('');

const submit = async () => {
  if (!name.value.trim()) return;
  loading.value = true;
  error.value = '';
  try {
    const payload = {
      parentId: props.parentId,
      name: name.value.trim(),
      description: description.value.trim(),
      tags: tags.value ? tags.value.split(',').map(t => t.trim()).filter(Boolean) : []
    };
    const res = await createSubtopic(payload);
    emit('created', res?.topic);
    name.value = '';
    description.value = '';
    tags.value = '';
    emit('close');
  } catch (e) {
    error.value = e?.response?.data?.message || 'Błąd tworzenia podtematu';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div v-if="open" class="modal">
    <div class="content">
      <h3>Utwórz podtemat</h3>
      <input v-model="name" placeholder="Nazwa" />
      <textarea v-model="description" placeholder="Opis"></textarea>
      <input v-model="tags" placeholder="Tagi (oddzielone przecinkami)" />
      <div>
        <button :disabled="loading || !name.trim()" @click="submit">Utwórz</button>
        <button @click="$emit('close')">Zamknij</button>
        <span v-if="error" class="error">{{ error }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.content {
  background: #fff;
  padding: 1rem;
  border-radius: 6px;
  min-width: 360px;
  display: grid;
  gap: 0.5rem;
}
textarea {
  min-height: 100px;
}
</style>
