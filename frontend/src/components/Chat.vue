<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useSocketStore } from '../stores/socket';
import { authStore } from '../stores/auth';

import { listAllUsers } from '../services/userService';

const auth = authStore();
const socketStore = useSocketStore();
const isAdmin = computed(() => auth.user?.role === 'admin');

const messages = ref([]);
const toUserId = ref('');
const newMessage = ref('');
const users = ref([]);

const handleAdminNotify = (data) => {
	messages.value.push({ type: 'notify', payload: data, ts: new Date() });
};

onMounted(async () => {
	socketStore.on('admin:notify', handleAdminNotify);
	if (isAdmin.value) {
		try {
			users.value = await listAllUsers();
		} catch (e) {
			users.value = [];
		}
	}
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
		<div class="chat-controls">
			<div v-if="isAdmin">
				<select v-model="toUserId" class="user-select">
					<option value="">Wybierz użytkownika</option>
					<option v-for="u in users" :key="u._id || u.id" :value="u._id || u.id">
						{{ u.login || u.email || u._id || u.id }}
					</option>
				</select>
			</div>
			<input v-model="newMessage" placeholder="Wiadomość" class="message-input" />
			<button @click="send" class="send-button">Wyślij</button>
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