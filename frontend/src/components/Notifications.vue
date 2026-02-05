<template>
  <div v-if="notifications.length" class="notifications">
    <div v-for="(n, i) in notifications" :key="i" class="notification" :class="n.type || 'info'">
      <span>{{ n.message }}</span>
      <button @click="remove(i)" class="close-notification">X</button>
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
.notifications {
  position: fixed;
  top: 20px;
  right: 20px;
  max-width: 450px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 6px;
  border-left: 4px solid;
  background-color: rgb(238, 255, 0);
  border-left-color: rgb(238, 255, 0);
  color: rgb(0, 0, 0);
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.notification.success {
  background-color: rgb(74, 222, 128);
  border-left-color: #4ade80;
  color: #000000;
}

.notification.error {
  background-color: rgb(239, 68, 68);
  border-left-color: #ef4444;
  color: #000000;
}

.notification.warning {
  background-color: rgb(249, 116, 22);
  border-left-color: #f97316;
  color: #000000;
}

.close-notification {
  flex-shrink: 0;
  background-color: transparent;
  border: 1px solid currentColor;
  color: inherit;
  width: 24px;
  height: 24px;
  border-radius: 3px;
  padding: 0;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease;
  font-family: inherit;
  font-size: 1em;
}

.close-notification:hover {
  background-color: currentColor;
  color: #000000;
}

</style>
