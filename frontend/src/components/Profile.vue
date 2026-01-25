<script setup>
import { computed, onMounted } from 'vue';
import { authStore } from '../auth';

const auth = authStore();
const user = computed(() => auth.user || {});

const refresh = async () => {
	await auth.fetchUser();
};

onMounted(() => {
	if (!auth.user) refresh();
});
</script>

<template>
	<div>
		<h2>Profil</h2>
		<div v-if="!auth.isLoggedIn">Nie jesteś zalogowany.</div>
		<div v-else>
			<p><strong>Login:</strong> {{ user.login }}</p>
			<p><strong>Email:</strong> {{ user.mail }}</p>
			<p><strong>Rola:</strong> {{ user.role }}</p>
			<p><strong>Zaakceptowany:</strong> {{ user.isApprovedByAdmin ? 'Tak' : 'Nie' }}</p>
			<button @click="refresh">Odśwież</button>
		</div>
	</div>
</template>