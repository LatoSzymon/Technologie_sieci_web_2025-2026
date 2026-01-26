<template>
  <div v-if="notifications.length" class="notifications">
    <div v-for="(n, i) in notifications" :key="i" class="notification" :class="n.type || 'info'">
      <span>{{ n.message }}</span>
      <button @click="remove(i)">×</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const notifications = ref([]);

function addNotification(n) {
  notifications.value.push(n);
  setTimeout(() => remove(0), 5000);
}

function remove(idx) {
  notifications.value.splice(idx, 1);
}

onMounted(() => {
  window.addEventListener('admin-notify', (e) => {
    addNotification({ message: e.detail?.message || 'Nowa notyfikacja', type: e.detail?.type });
  });
});

onUnmounted(() => {
  window.removeEventListener('admin-notify', addNotification);
});
</script>

<style scoped>

</style>
