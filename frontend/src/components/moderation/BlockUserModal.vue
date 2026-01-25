<script setup>
import { ref } from 'vue';
import { blockUserInTopic, unblockUserInTopic } from '../../services/topicService';

const props = defineProps({
  topicId: { type: String, required: true },
  open: { type: Boolean, default: false }
});
const emit = defineEmits(['close', 'blocked', 'unblocked']);

const userId = ref('');
const loading = ref(false);
const error = ref('');

const blockUser = async () => {
  if (!userId.value) return;
  loading.value = true;
  error.value = '';
  try {
    await blockUserInTopic({ topicId: props.topicId, userId: userId.value });
    emit('blocked', userId.value);
    userId.value = '';
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
    <div class="content">
      <h3>Blokuj / Odblokuj użytkownika</h3>
      <input v-model="userId" placeholder="ID użytkownika" />
      <div style="margin-top:0.5rem;">
        <button :disabled="loading || !userId" @click="blockUser">Zablokuj</button>
        <button :disabled="loading || !userId" @click="unblockUser">Odblokuj</button>
        <button @click="$emit('close')">Zamknij</button>
        <span v-if="error" style="color:red; margin-left:1rem;">{{ error }}</span>
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
  min-width: 320px;
}
</style>
