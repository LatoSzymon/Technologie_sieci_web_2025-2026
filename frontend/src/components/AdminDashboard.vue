<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import {
	listUnapprovedUsers,
	listBlockedUsers,
	listAllNonAdminUsers,
	approveUser,
	blockUser,
	unblockUser,
	deleteUser
} from '../services/adminService';
import tagService from '../services/tagService';
import { useSocketStore } from '../stores/socket';

const socketStore = useSocketStore();

const pendingUsers = ref([]);
const blockedUsers = ref([]);
const allUsers = ref([]);
const tags = ref([]);
const loading = ref(false);
const error = ref('');
const newTagName = ref('');
const activityLog = ref([]);
const pendingSearchQuery = ref('');
const blockedSearchQuery = ref('');
const usersSearchQuery = ref('');
const tagSearchQuery = ref('');

const handleUsersUpdated = (data) => {
	if (data?.type === 'blocked' || data?.type === 'unblocked') {
		fetchAllUsers();
		fetchBlocked();
	}
};

onMounted(() => {
	fetchPending();
	fetchBlocked();
	fetchAllUsers();
	fetchTags();

	socketStore.on('admin:users-updated', handleUsersUpdated);
	socketStore.on('admin:notify', handleAdminNotify);
	socketStore.on('tag:created', fetchTags);
	socketStore.on('tag:updated', fetchTags);
	socketStore.on('tag:deleted', fetchTags);
});

onBeforeUnmount(() => {
	socketStore.off('admin:users-updated', handleUsersUpdated);
	socketStore.off('admin:notify', handleAdminNotify);
	socketStore.off('tag:created', fetchTags);
	socketStore.off('tag:updated', fetchTags);
	socketStore.off('tag:deleted', fetchTags);
});

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

const fetchBlocked = async () => {
	try {
		blockedUsers.value = await listBlockedUsers();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd pobierania listy blokowanych';
	}
};

const fetchAllUsers = async () => {
	try {
		allUsers.value = await listAllNonAdminUsers();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd pobierania listy użytkowników';
		console.error(e);
	}
};

const fetchTags = async () => {
	try {
		tags.value = await tagService.getTags(null, { all: true });
	} catch (e) {
		error.value = 'Błąd pobierania tagów';
		console.error(e);
	}
};

const addActivityEntry = (type, message, context = {}) => {
	const entry = {
		id: crypto?.randomUUID?.() || String(Date.now()),
		ts: new Date(),
		type,
		message,
		context
	};
	activityLog.value.unshift(entry);
	activityLog.value = activityLog.value.slice(0, 200);
};

const notify = (type, message, context = {}) => {
	socketStore.pushNotification({ type, message });
	addActivityEntry(type, message, context);
};

const handleAdminNotify = (data) => {
	const message = data?.message || 'Nowe powiadomienie admina';
	const type = data?.type || 'info';
	addActivityEntry(type, message, data || {});

	switch (data?.type) {
		case 'new-user':
		case 'user-approved':
			fetchPending();
			break;
		case 'user-blocked':
		case 'user-unblocked':
			fetchBlocked();
			fetchAllUsers();
			break;
		case 'user-deleted':
			fetchAllUsers();
			break;
		default:
			break;
	}
};

const normalizeSearch = (value) => value.trim().toLowerCase();

const filteredPendingUsers = computed(() => {
	const query = normalizeSearch(pendingSearchQuery.value);
	if (!query) return pendingUsers.value;
	return pendingUsers.value.filter(user =>
		user.login?.toLowerCase().includes(query) || user.mail?.toLowerCase().includes(query)
	);
});

const filteredBlockedUsers = computed(() => {
	const query = normalizeSearch(blockedSearchQuery.value);
	if (!query) return blockedUsers.value;
	return blockedUsers.value.filter(user =>
		user.login?.toLowerCase().includes(query) || user.mail?.toLowerCase().includes(query)
	);
});

const filteredAllUsers = computed(() => {
	const query = normalizeSearch(usersSearchQuery.value);
	if (!query) return allUsers.value;
	return allUsers.value.filter(user =>
		user.login?.toLowerCase().includes(query) || user.mail?.toLowerCase().includes(query)
	);
});

const filteredTags = computed(() => {
	const query = normalizeSearch(tagSearchQuery.value);
	if (!query) return tags.value;
	return tags.value.filter(tag => tag.name?.toLowerCase().includes(query));
});

const findUserLabel = (userId) => {
	const source = [...pendingUsers.value, ...blockedUsers.value, ...allUsers.value];
	const match = source.find(user => user._id === userId);
	return match?.login || userId;
};

const addTag = async () => {
	if (!newTagName.value.trim()) {
		error.value = 'Wpisz nazwę tagu';
		return;
	}
	try {
		await tagService.createTag({ name: newTagName.value.trim() });
		notify('success', 'Dodano tag', { scope: 'tags' });
		newTagName.value = '';
		await fetchTags();
	} catch (e) {
		const message = e?.response?.data?.message || 'Błąd dodawania tagu';
		error.value = message;
		notify('error', message, { scope: 'tags' });
	}
};

const deleteTag = async (tagId) => {
	if (!confirm('Usunąć ten tag?')) return;
	try {
		await tagService.deleteTag(tagId);
		notify('success', 'Usunięto tag', { scope: 'tags' });
		await fetchTags();
	} catch (e) {
		const message = e?.response?.data?.message || 'Błąd usuwania tagu';
		error.value = message;
		notify('error', message, { scope: 'tags' });
	}
};

const approve = async (userId) => {
	try {
		await approveUser(userId);
		notify('success', `Zaakceptowano użytkownika: ${findUserLabel(userId)}`, { scope: 'users', userId });
		await fetchPending();
	} catch (e) {
		const message = e?.response?.data?.message || 'Błąd akceptacji';
		error.value = message;
		notify('error', message, { scope: 'users', userId });
	}
};

const block = async (userId) => {
	try {
		await blockUser(userId);
		notify('warning', `Zablokowano użytkownika: ${findUserLabel(userId)}`, { scope: 'users', userId });
		await fetchAllUsers();
		await fetchBlocked();
	} catch (e) {
		const message = e?.response?.data?.message || 'Błąd blokowania';
		error.value = message;
		notify('error', message, { scope: 'users', userId });
	}
};

const unblock = async (userId) => {
	try {
		await unblockUser(userId);
		notify('success', `Odblokowano użytkownika: ${findUserLabel(userId)}`, { scope: 'users', userId });
		await fetchAllUsers();
		await fetchBlocked();
	} catch (e) {
		const message = e?.response?.data?.message || 'Błąd odblokowania';
		error.value = message;
		notify('error', message, { scope: 'users', userId });
	}
};

const deleteUserAction = async (userId) => {
	if (!confirm('Czy na pewno usunąć tego użytkownika? (Ta operacja jest nieodwracalna)')) return;
	try {
		await deleteUser(userId);
		notify('warning', `Usunięto użytkownika: ${findUserLabel(userId)}`, { scope: 'users', userId });
		await fetchAllUsers();
	} catch (e) {
		const message = e?.response?.data?.message || 'Błąd usuwania użytkownika';
		error.value = message;
		notify('error', message, { scope: 'users', userId });
	}
};
</script>

<template>
	<div class="admin-container">
		<h2 class="admin-title">Panel Administratora</h2>
		<div v-if="loading" class="loading-message">Ładowanie...</div>
		<div v-if="error" class="alert alert-error">{{ error }}</div>

		<section class="admin-section section-activity">
			<div class="section-header">
				<h3 class="section-title">Wykaz aktywności</h3>
				<div class="section-tools">
					<span class="section-meta">{{ activityLog.length }} zdarzeń</span>
				</div>
			</div>
			<div v-if="activityLog.length === 0" class="empty-state">Brak zdarzeń do wyświetlenia.</div>
			<ul v-else class="notifications-list list-scroll">
				<li v-for="n in activityLog" :key="n.id" class="notification-item">
					<span class="notification-time">{{ n.ts?.toLocaleString?.() || '' }}</span>
					<span class="badge" :class="`badge-${n.type || 'other'}`">
						{{ n.type || 'info' }}
					</span>
					<span class="notification-message">{{ n.message }}</span>
				</li>
			</ul>
		</section>

		<section class="admin-section section-tags">
			<div class="section-header">
				<h3 class="section-title">Zarządzanie tagami</h3>
				<div class="section-tools">
					<input
						v-model="tagSearchQuery"
						placeholder="Szukaj tagu..."
						class="form-input form-input-sm"
					/>
				</div>
			</div>
			<div class="tag-management">
				<div class="tag-input-group">
					<input
						v-model="newTagName"
						placeholder="Nazwa nowego tagu"
						@keyup.enter="addTag"
						class="form-input"
					/>
					<button @click="addTag" class="btn btn-primary">Dodaj tag</button>
				</div>

				<div class="tags-list-container">
					<div class="list-header">
						<h4>Istniejące tagi ({{ filteredTags.length }})</h4>
					</div>
					<div v-if="filteredTags.length === 0" class="empty-state">Brak tagów</div>
					<div v-else class="tags-grid list-scroll">
						<div v-for="tag in filteredTags" :key="tag._id" class="tag-item">
							<span class="tag-name">{{ tag.name }}</span>
							<button
								class="tag-delete-btn"
								@click="deleteTag(tag._id)"
								title="Usuń tag"
							>
								X
							</button>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="admin-section section-pending">
			<div class="section-header">
				<h3 class="section-title">Niezaakceptowani użytkownicy</h3>
				<div class="section-tools">
					<input
						v-model="pendingSearchQuery"
						placeholder="Szukaj użytkownika..."
						class="form-input form-input-sm"
					/>
				</div>
			</div>
			<div v-if="filteredPendingUsers.length === 0" class="empty-state">Brak oczekujących.</div>
			<div v-else class="users-list list-scroll">
				<div v-for="u in filteredPendingUsers" :key="u._id" class="user-card">
					<div class="user-card-header">
						<strong class="user-login">{{ u.login }}</strong>
						<small class="user-email">{{ u.mail }}</small>
					</div>
					<div class="user-card-actions">
						<button @click="approve(u._id)" class="btn btn-success">Akceptuj</button>
						<button @click="block(u._id)" class="btn btn-danger">Zablokuj</button>
					</div>
				</div>
			</div>
		</section>

		<section class="admin-section section-blocked">
			<div class="section-header">
				<h3 class="section-title">Zablokowani użytkownicy</h3>
				<div class="section-tools">
					<input
						v-model="blockedSearchQuery"
						placeholder="Szukaj użytkownika..."
						class="form-input form-input-sm"
					/>
				</div>
			</div>
			<div v-if="filteredBlockedUsers.length === 0" class="empty-state">Brak zablokowanych.</div>
			<div v-else class="users-list list-scroll">
				<div v-for="u in filteredBlockedUsers" :key="u._id" class="user-card">
					<div class="user-card-header">
						<strong class="user-login">{{ u.login }}</strong>
						<small class="user-email">{{ u.mail }}</small>
					</div>
					<div class="user-card-actions">
						<button @click="unblock(u._id)" class="btn btn-success">Odblokuj</button>
					</div>
				</div>
			</div>
		</section>

		<section class="admin-section section-users">
			<div class="section-header">
				<h3 class="section-title">Zarządzanie użytkownikami</h3>
				<div class="section-tools">
					<input
						v-model="usersSearchQuery"
						placeholder="Szukaj użytkownika..."
						class="form-input form-input-sm"
					/>
				</div>
			</div>
			<div v-if="filteredAllUsers.length === 0" class="empty-state">Brak użytkowników.</div>
			<div v-else class="users-management">
				<div class="users-count">Użytkownicy: <strong>{{ filteredAllUsers.length }}</strong></div>
				<div class="list-scroll list-scroll-lg">
					<div class="users-grid">
						<div v-for="u in filteredAllUsers" :key="u._id" class="user-card">
							<div class="user-card-header">
								<strong class="user-login">{{ u.login }}</strong>
								<small class="user-email">{{ u.mail }}</small>
							</div>
							<div class="user-badges">
								<span v-if="u.isBlocked" class="badge badge-blocked">Zablokowany</span>
								<span v-if="!u.isApprovedByAdmin" class="badge badge-pending">Oczekuje</span>
							</div>
							<div class="user-card-actions">
								<button
									v-if="!u.isBlocked"
									@click="block(u._id)"
									class="btn btn-danger"
									title="Zablokuj użytkownika"
								>
									Blokuj
								</button>
								<button
									v-else
									@click="unblock(u._id)"
									class="btn btn-success"
									title="Odblokuj użytkownika"
								>
									Odblokuj
								</button>
								<button
									@click="deleteUserAction(u._id)"
									class="btn btn-danger"
									title="Usuń użytkownika"
								>
									Usuń
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	</div>
</template>

<style scoped>
.admin-container {
	max-width: 1200px;
	margin: 0 auto;
	padding: 20px;
}

.admin-title {
	font-size: 2.5em;
	margin-bottom: 30px;
	text-align: center;
	color: var(--accent);
	text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.admin-section {
	border-radius: 8px;
	padding: 20px;
	margin-bottom: 20px;
	background: var(--panel);
	border: 2px solid var(--border);
}

.section-activity {
	background: var(--panel);
	border: 2px solid var(--border);
}

.section-tags {
	background: var(--panel);
	border: 2px solid var(--border);
}

.section-pending {
	background: var(--panel);
	border: 2px solid var(--border);
}

.section-blocked {
	background: var(--panel);
	border: 2px solid var(--border);
}

.section-users {
	background: var(--panel);
	border: 2px solid var(--border);
}

.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	flex-wrap: wrap;
	margin-bottom: 12px;
}

.section-title {
	color: var(--accent);
	margin: 0;
	font-size: 1.3em;
}

.section-tools {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
}

.section-meta {
	color: var(--text-soft);
	font-size: 0.9em;
}

.empty-state {
	text-align: center;
	padding: 30px 20px;
	color: var(--text-soft);
	font-style: italic;
}

.loading-message {
	text-align: center;
	padding: 20px;
	color: var(--accent);
	font-weight: 500;
}

.alert {
	padding: 15px;
	border-radius: 6px;
	margin-bottom: 20px;
	font-weight: 500;
}

.alert-error {
	background-color: rgba(244, 107, 107, 0.2);
	border: 2px solid var(--danger);
	color: var(--text);
}

.form-input {
	background-color: rgba(0, 0, 0, 0.35);
	border: 2px solid var(--border);
	border-radius: 6px;
	padding: 10px 15px;
	color: var(--text);
	font-size: 1em;
	font-family: inherit;
	transition: all 0.3s ease;
}

.form-input:focus {
	outline: none;
	border-color: var(--accent-strong);
	background-color: rgba(0, 0, 0, 0.5);
}

.form-input::placeholder {
	color: rgba(229, 242, 103, 0.5);
}

.form-input-sm {
	padding: 8px 12px;
	font-size: 0.9em;
	min-width: 220px;
}

.btn {
	padding: 8px 12px;
	border: 2px solid var(--border);
	border-radius: 6px;
	font-size: 0.85em;
	font-family: inherit;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.3s ease;
}

.btn-primary {
	background-color: var(--accent);
	color: #000000;
	border-color: var(--border);
}

.btn-primary:hover {
	background-color: var(--accent-strong);
	border-color: var(--accent-strong);
}

.btn-success {
	background-color: var(--success);
	color: #000000;
	border-color: var(--success);
}

.btn-success:hover {
	background-color: var(--success);
	border-color: var(--success);
}

.btn-danger {
	background-color: var(--danger);
	color: #000000;
	border-color: var(--danger);
}

.btn-danger:hover {
	background-color: var(--danger);
	border-color: var(--danger);
}

.notifications-list {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.notification-item {
	background-color: rgba(229, 242, 103, 0.08);
	border-left: 4px solid var(--accent);
	padding: 12px;
	border-radius: 4px;
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
}

.notification-time {
	color: var(--text-soft);
	font-size: 0.85em;
	min-width: 140px;
}

.notification-message {
	color: var(--text);
	flex: 1;
}

.badge {
	display: inline-block;
	padding: 4px 10px;
	border-radius: 4px;
	font-size: 0.8em;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.badge-success {
	background-color: var(--success);
	color: #000000;
}

.badge-error {
	background-color: var(--danger);
	color: #000000;
}

.badge-warning {
	background-color: var(--warning);
	color: #000000;
}

.badge-info {
	background-color: var(--accent-soft);
	color: #000000;
}

.badge-other {
	background-color: var(--accent);
	color: #000000;
}

.badge-blocked {
	background-color: rgba(244, 107, 107, 0.2);
	color: var(--text);
	border: 1px solid var(--danger);
}

.badge-pending {
	background-color: rgba(242, 162, 58, 0.2);
	color: var(--text);
	border: 1px solid var(--warning);
}

.tag-management {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 20px;
}

.tag-input-group {
	display: flex;
	gap: 10px;
}

.tag-input-group .form-input {
	flex: 1;
	max-width: 400px;
}

.tags-list-container {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.list-header h4 {
	color: var(--accent);
	margin: 0 0 10px 0;
	font-size: 1.1em;
}

.tags-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
}

.tag-item {
	display: flex;
	align-items: center;
	gap: 8px;
	background-color: rgba(229, 242, 103, 0.12);
	border: 1px solid var(--border);
	padding: 8px 12px;
	border-radius: 20px;
	color: var(--accent);
}

.tag-name {
	font-weight: 500;
}

.tag-delete-btn {
	padding: 0;
	width: 20px;
	height: 20px;
	min-width: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--danger);
	border: none;
	border-radius: 50%;
	font-size: 1em;
	line-height: 1;
	color: white;
	cursor: pointer;
	transition: all 0.3s ease;
}

.tag-delete-btn:hover {
	background-color: var(--danger);
	transform: scale(1.15);
}

.users-list,
.users-management {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.users-count {
	color: var(--accent);
	font-weight: 500;
	margin-bottom: 10px;
}

.users-count strong {
	color: var(--accent-strong);
	font-size: 1.2em;
}

.users-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
	gap: 15px;
}

.user-card {
	border: 2px solid var(--border);
	border-radius: 6px;
	padding: 15px;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.user-card:hover {
	background-color: rgba(229, 242, 103, 0.08);
}

.user-card-header {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.user-login {
	color: var(--accent);
	font-size: 1.1em;
}

.user-email {
	color: var(--text-soft);
	font-size: 0.9em;
}

.user-badges {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}

.user-card-actions {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}

.user-card-actions .btn {
	flex: 0 0 auto;
	min-width: 110px;
}

.list-scroll {
	max-height: 320px;
	overflow-y: auto;
	padding-right: 6px;
}

.list-scroll-lg {
	max-height: 520px;
}

@media (max-width: 768px) {
	.admin-container {
		padding: 10px;
	}

	.admin-title {
		font-size: 1.8em;
	}

	.users-grid {
		grid-template-columns: 1fr;
	}

	.tag-input-group {
		flex-direction: column;
	}

	.tag-input-group .form-input {
		max-width: 100%;
	}

	.user-card-actions {
		flex-direction: column;
	}

	.user-card-actions .btn {
		width: 100%;
	}
}
</style>