<template>
  <div v-if="show" class="modal-backdrop">
    <div class="modal">
      <h2>Utwórz nowy temat</h2>
      <form @submit.prevent="submit">
        <label>Nazwa tematu:
          <input v-model="name" required />
        </label>
        <label>Tagi (oddzielone przecinkami):
          <input v-model="tags" placeholder="np. javascript, vue" />
        </label>
        <button type="submit">Utwórz</button>
        <button type="button" @click="$emit('close')">Anuluj</button>
      </form>
      <div v-if="error" class="error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useTopicsStore } from '../topics';

const props = defineProps({
  show: Boolean
});
const emit = defineEmits(['close', 'created']);

const name = ref('');
const tags = ref('');
const error = ref('');
const topics = useTopicsStore();

const submit = async () => {
  error.value = '';
  try {
    await topics.createTopic({
      name: name.value,
      tags: tags.value.split(',').map(t => t.trim()).filter(Boolean)
    });
    emit('created');
    emit('close');
    name.value = '';
    tags.value = '';
  } catch (e) {
    error.value = e?.message || 'Błąd podczas tworzenia tematu';
  }
};
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
  min-width: 300px;
}
.error {
  color: red;
  margin-top: 1em;
}
</style>
