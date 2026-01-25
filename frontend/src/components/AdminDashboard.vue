<script setup>
import { ref, onMounted } from 'vue';
import { listUnapprovedUsers, approveUser, blockUser, unblockUser } from '../services/adminService';
import Chat from './Chat.vue';

const pendingUsers = ref([]);
const loading = ref(false);
const error = ref('');
const actionInfo = ref('');
const manualUserId = ref('');

const fetchPending = async () => {
	loading.value = true;
	error.value = '';
	try {
		pendingUsers.value = await listUnapprovedUsers();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd pobierania listy';
	} finally {
		loading.value = false;
	}
};

const approve = async (userId) => {
	actionInfo.value = '';
	try {
		await approveUser(userId);
		actionInfo.value = 'Zaakceptowano użytkownika';
		await fetchPending();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd akceptacji';
	}
};

const block = async (userId) => {
	actionInfo.value = '';
	try {
		await blockUser(userId);
		actionInfo.value = 'Zablokowano użytkownika';
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd blokowania';
	}
};

const unblock = async (userId) => {
	actionInfo.value = '';
	try {
		await unblockUser(userId);
		actionInfo.value = 'Odblokowano użytkownika';
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd odblokowania';
	}
};

onMounted(fetchPending);
</script>

<template>
	<div>
		<h2>Panel administratora</h2>
		<div v-if="loading">Ładowanie...</div>
		<div v-if="error" style="color:red">{{ error }}</div>
		<div v-if="actionInfo" style="color:green">{{ actionInfo }}</div>

		<section>
			<h3>Niezaakceptowani użytkownicy</h3>
			<div v-if="pendingUsers.length === 0"><em>Brak oczekujących.</em></div>
			<ul>
				<li v-for="u in pendingUsers" :key="u._id">
					<strong>{{ u.login }}</strong> <small>({{ u.mail }})</small>
					<button @click="approve(u._id)">Akceptuj</button>
					<button @click="block(u._id)">Zablokuj</button>
				</li>
			</ul>
		</section>

		<section style="margin-top:1rem;">
			<h3>Blokowanie/Odblokowanie (ręcznie)</h3>
			<input v-model="manualUserId" placeholder="ID użytkownika" />
			<button :disabled="!manualUserId" @click="block(manualUserId)">Zablokuj</button>
			<button :disabled="!manualUserId" @click="unblock(manualUserId)">Odblokuj</button>
		</section>

		<section style="margin-top:2rem;">
			<h3>Chat z użytkownikami</h3>
			<Chat />
		</section>
	</div>
  
</template>