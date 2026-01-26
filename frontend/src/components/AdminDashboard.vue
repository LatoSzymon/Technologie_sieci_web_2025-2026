<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { listUnapprovedUsers, approveUser, blockUser, unblockUser } from '../services/adminService';
import tagService from '../services/tagService';
import Chat from './Chat.vue';

const notifications = ref([]);
const handleNotify = (e) => {
	notifications.value.unshift({ ...(e.detail || {}), ts: new Date() });
};

onMounted(() => {
	window.addEventListener('admin-notify', handleNotify);
	if (window.__adminNotifications) {
		notifications.value = [...window.__adminNotifications].reverse();
	}
	fetchPending();
	fetchTags();
});

onBeforeUnmount(() => {
	window.removeEventListener('admin-notify', handleNotify);
});

const pendingUsers = ref([]);
const tags = ref([]);
const loading = ref(false);
const error = ref('');
const actionInfo = ref('');
const manualUserId = ref('');
const newTagName = ref('');

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

const fetchTags = async () => {
	try {
		tags.value = await tagService.getTags();
	} catch (e) {
		error.value = 'Błąd pobierania tagów';
		console.error(e);
	}
};

const addTag = async () => {
	if (!newTagName.value.trim()) {
		error.value = 'Wpisz nazwę tagu';
		return;
	}
	try {
		await tagService.createTag({ name: newTagName.value.trim() });
		actionInfo.value = 'Dodano tag';
		newTagName.value = '';
		await fetchTags();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd dodawania tagu';
	}
};

const deleteTag = async (tagId) => {
	if (!confirm('Usunąć ten tag?')) return;
	try {
		await tagService.deleteTag(tagId);
		actionInfo.value = 'Usunięto tag';
		await fetchTags();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd usuwania tagu';
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
			<h3>Powiadomienia administracyjne</h3>
			<ul v-if="notifications.length">
				<li v-for="(n, idx) in notifications" :key="idx">
					<small>{{ n.ts?.toLocaleString?.() || '' }}</small>
					<span v-if="n.type === 'new-user'">[Nowa rejestracja]</span>
					<span v-else-if="n.type === 'user-approved'">[Akceptacja]</span>
					<span v-else>[Inne]</span>
					{{ n.message }}
				</li>
			</ul>
			<div v-else><em>Brak powiadomień.</em></div>
		</section>

		<section>
			<h3>Zarządzanie tagami</h3>
			<div class="tag-management">
				<div class="add-tag">
					<input 
						v-model="newTagName" 
						placeholder="Nazwa nowego tagu" 
						@keyup.enter="addTag"
					/>
					<button @click="addTag">Dodaj tag</button>
				</div>
				
				<div class="tags-list">
					<h4>Istniejące tagi ({{ tags.length }}):</h4>
					<div v-if="tags.length === 0" class="no-tags">Brak tagów</div>
					<div v-else class="tags-grid">
						<div v-for="tag in tags" :key="tag._id" class="tag-item">
							<span class="tag-name">{{ tag.name }}</span>
							<button 
								class="delete-btn"
								@click="deleteTag(tag._id)"
								title="Usuń tag"
							>
								✕
							</button>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section style="margin-top:1rem;">
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

<style scoped>
section {
	border: 1px solid #ddd;
	padding: 1rem;
	margin-bottom: 1rem;
	border-radius: 4px;
}

h3 {
	margin-top: 0;
}

ul {
	list-style: none;
	padding: 0;
}

li {
	padding: 0.5rem;
	border-bottom: 1px solid #eee;
}

li:last-child {
	border-bottom: none;
}

button {
	padding: 0.25rem 0.75rem;
	margin-left: 0.5rem;
	background: #007bff;
	color: white;
	border: none;
	border-radius: 3px;
	cursor: pointer;
}

button:hover {
	background: #0056b3;
}

button:disabled {
	background: #ccc;
	cursor: not-allowed;
}

input {
	padding: 0.5rem;
	border: 1px solid #ddd;
	border-radius: 3px;
	width: 200px;
}

.tag-management {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.add-tag {
	display: flex;
	gap: 0.5rem;
}

.add-tag input {
	flex: 1;
	max-width: 300px;
}

.tags-list h4 {
	margin-top: 0;
	margin-bottom: 0.5rem;
}

.tags-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
}

.tag-item {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	background: #f0f0f0;
	padding: 0.5rem 0.75rem;
	border-radius: 20px;
	font-size: 0.9em;
}

.tag-name {
	font-weight: 500;
}

.delete-btn {
	padding: 0;
	width: 24px;
	height: 24px;
	min-width: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #dc3545;
	border-radius: 50%;
	font-size: 1.2em;
	line-height: 1;
	margin-left: 0.25rem;
}

.delete-btn:hover {
	background: #c82333;
}

.no-tags {
	color: #999;
	font-style: italic;
	padding: 1rem;
	text-align: center;
}
</style>