<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useSocketStore } from '../stores/socket';
import { authStore } from '../auth';

const auth = authStore();
const socketStore = useSocketStore();
const isAdmin = computed(() => auth.user?.role === 'admin');

const messages = ref([]);
const toUserId = ref('');
const newMessage = ref('');

const handleAdminNotify = (data) => {
	messages.value.push({ type: 'notify', payload: data, ts: new Date() });
};

onMounted(() => {
	socketStore.on('admin:notify', handleAdminNotify);
});

onBeforeUnmount(() => {
	socketStore.off('admin:notify', handleAdminNotify);
});

const send = () => {
	const msg = newMessage.value.trim();
	if (!msg) return;

	if (isAdmin.value) {
		if (!toUserId.value) return;
		socketStore.emit('admin:message', { toUserId: toUserId.value, message: msg });
		messages.value.push({ type: 'sent-admin', payload: { toUserId: toUserId.value, message: msg }, ts: new Date() });
	} else {
		const fromUserId = auth.user?._id || auth.user?.id;
		socketStore.emit('user:notifyAdmins', { fromUserId, message: msg });
		messages.value.push({ type: 'sent-user', payload: { message: msg }, ts: new Date() });
	}
	newMessage.value = '';
};
</script>

<template>
	<div>
		<div style="margin-bottom:1rem;">
			<div v-if="isAdmin">
				<input v-model="toUserId" placeholder="ID użytkownika" />
			</div>
			<input v-model="newMessage" placeholder="Wiadomość" style="width:60%" />
			<button @click="send">Wyślij</button>
		</div>

		<ul>
			<li v-for="(m, idx) in messages" :key="idx">
				<small>{{ m.ts.toLocaleTimeString() }}</small>
				<span v-if="m.type==='notify'"> [Powiadomienie] {{ m.payload.message }}</span>
				<span v-else-if="m.type==='sent-admin'"> [Wysłano do {{ m.payload.toUserId }}] {{ m.payload.message }}</span>
				<span v-else> [Wysłano] {{ m.payload.message }}</span>
			</li>
		</ul>
	</div>
</template>