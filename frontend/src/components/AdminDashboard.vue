<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { listUnapprovedUsers, listBlockedUsers, listAllNonAdminUsers, approveUser, blockUser, unblockUser, deleteUser, closeTopic, openTopic, hideTopic, unhideTopic, getStatistics } from '../services/adminService';
import tagService from '../services/tagService';
import * as topicService from '../services/topicService';
import { useSocketStore } from '../stores/socket';
import Chat from './Chat.vue';

const notifications = ref([]);
const socketStore = useSocketStore();
const handleNotify = (e) => {
	notifications.value.unshift({ ...(e.detail || {}), ts: new Date() });
};

const handleUsersUpdated = (data) => {
	if (data.type === 'blocked' || data.type === 'unblocked') {
		fetchAllUsers();
		fetchBlocked();
	}
};

onMounted(() => {
	window.addEventListener('admin-notify', handleNotify);
	if (window.__adminNotifications) {
		notifications.value = [...window.__adminNotifications].reverse();
	}
	fetchPending();
	fetchBlocked();
	fetchAllUsers();
	fetchAllTopics();
	fetchTags();
	fetchStatistics();
	
	socketStore.on('admin:users-updated', handleUsersUpdated);
});

onBeforeUnmount(() => {
	window.removeEventListener('admin-notify', handleNotify);
	socketStore.off('admin:users-updated', handleUsersUpdated);
});

const pendingUsers = ref([]);
const blockedUsers = ref([]);
const allUsers = ref([]);
const allTopics = ref([]);
const tags = ref([]);
const statistics = ref(null);
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
		tags.value = await tagService.getTags();
	} catch (e) {
		error.value = 'Błąd pobierania tagów';
		console.error(e);
	}
};

const fetchAllTopics = async () => {
	try {
		const response = await topicService.getTopicTree();
		allTopics.value = response.topics || [];
	} catch (e) {
		error.value = 'Błąd pobierania tematów';
		console.error(e);
	}
};

const fetchStatistics = async () => {
	try {
		statistics.value = await getStatistics();
	} catch (e) {
		error.value = 'Błąd pobierania statystyk';
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

const deleteUserAction = async (userId) => {
	if (!confirm('Czy na pewno usunąć tego użytkownika? (Ta operacja jest nieodwracalna)')) return;
	actionInfo.value = '';
	try {
		await deleteUser(userId);
		actionInfo.value = 'Usunięto użytkownika';
		await fetchAllUsers();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd usuwania użytkownika';
	}
};

const closeTopicAction = async (topicId) => {
	if (!confirm('Zamknąć ten temat?')) return;
	try {
		await closeTopic(topicId);
		actionInfo.value = 'Zamknięto temat';
		await fetchAllTopics();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd zamykania tematu';
	}
};

const openTopicAction = async (topicId) => {
	if (!confirm('Otworzyć ten temat?')) return;
	try {
		await openTopic(topicId);
		actionInfo.value = 'Otwarty temat';
		await fetchAllTopics();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd otwierania tematu';
	}
};

const hideTopicAction = async (topicId) => {
	if (!confirm('Ukryć ten temat?')) return;
	try {
		await hideTopic(topicId);
		actionInfo.value = 'Ukryto temat';
		await fetchAllTopics();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd ukrywania tematu';
	}
};

const unhideTopicAction = async (topicId) => {
	if (!confirm('Odkryć ten temat?')) return;
	try {
		await unhideTopic(topicId);
		actionInfo.value = 'Odkryto temat';
		await fetchAllTopics();
	} catch (e) {
		error.value = e?.response?.data?.message || 'Błąd odkrywania tematu';
	}
};

onMounted(fetchPending);
</script>

<template>
	<div>
		<h2>Panel administratora</h2>
		<div v-if="loading">Ładowanie...</div>
		<div v-if="error" class="error-message">{{ error }}</div>
		<div v-if="actionInfo" class="success-message">{{ actionInfo }}</div>

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

		<section class="section-spacing">
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

		<section class="section-spacing">
			<h3>Zablokowani użytkownicy (globalnie)</h3>
			<div v-if="blockedUsers.length === 0"><em>Brak zablokowanych.</em></div>
			<ul>
				<li v-for="u in blockedUsers" :key="u._id">
					<strong>{{ u.login }}</strong> <small>({{ u.mail }})</small>
					<button @click="unblock(u._id)">Odblokuj</button>
				</li>
			</ul>
		</section>

		<section class="section-spacing">
			<h3>Zarządzanie użytkownikami</h3>
			<div v-if="allUsers.length === 0"><em>Brak użytkowników.</em></div>
			<div v-else class="users-management">
				<div class="users-list">
					<h4>Wszyscy użytkownicy ({{ allUsers.length }}):</h4>
					<div class="user-items">
						<div v-for="u in allUsers" :key="u._id" class="user-item">
							<div class="user-info">
								<strong>{{ u.login }}</strong>
								<small>({{ u.mail }})</small>
								<span v-if="u.isBlocked" class="blocked-badge">🚫 Zablokowany</span>
								<span v-if="!u.isApprovedByAdmin" class="pending-badge">⏳ Oczekuje akceptacji</span>
							</div>
							<div class="user-actions">
								<button 
									v-if="!u.isBlocked"
									@click="block(u._id)"
									class="btn-block"
									title="Zablokuj użytkownika"
								>
									Blokuj
								</button>
								<button 
									v-else
									@click="unblock(u._id)"
									class="btn-unblock"
									title="Odblokuj użytkownika"
								>
									Odblokuj
								</button>
								<button 
									@click="deleteUserAction(u._id)"
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

		<section>
			<h3>Zarządzanie tematami</h3>
			<div v-if="allTopics.length === 0"><em>Brak tematów.</em></div>
			<div v-else>
				<div v-for="topic in allTopics" :key="topic._id">
					<div>
						<div>
							<strong>{{ topic.name }}</strong>
						<span v-if="topic.isClosed" class="badge-closed">Zamknięty</span>
						<span v-if="topic.isHidden" class="badge-hidden">Ukryty</span>
						</div>
						<div>
							<button 
								v-if="!topic.isClosed"
								@click="closeTopicAction(topic._id)"
								title="Zamknij temat"
							>
							Zamknijs
							</button>
							<button 
								v-else
								@click="openTopicAction(topic._id)"
								class="btn-open-topic"
								title="Otwórz temat"
							>
								🔓
							</button>
							<button 
								v-if="!topic.isHidden"
								@click="hideTopicAction(topic._id)"
								class="btn-hide-topic"
								title="Ukryj temat"
							>
								👁️‍🗨️
							</button>
							<button 
								v-else
								@click="unhideTopicAction(topic._id)"
								class="btn-unhide-topic"
								title="Odkryj temat"
							>
								👀
							</button>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="section-spacing">
			<h3>Statystyki</h3>
			<div v-if="!statistics" class="loading-text">Ładowanie statystyk...</div>
			<div v-else>
				<div class="stats-grid">
					<div class="stat-card stat-users-total">
						<div class="stat-value">{{ statistics.users.total }}</div>
						<div class="stat-label">Użytkowników</div>
					</div>
					<div class="stat-card stat-users-approved">
						<div class="stat-value">{{ statistics.users.approved }}</div>
						<div class="stat-label">Zaakceptowanych</div>
					</div>
					<div class="stat-card stat-users-pending">
						<div class="stat-value">{{ statistics.users.pending }}</div>
						<div class="stat-label">Oczekujących</div>
					</div>
					<div class="stat-card stat-users-blocked">
						<div class="stat-value">{{ statistics.users.blocked }}</div>
						<div class="stat-label">Zablokowanych</div>
					</div>
					<div class="stat-card stat-topics">
						<div class="stat-value">{{ statistics.topics.total }}</div>
						<div class="stat-label">Tematów</div>
					</div>
					<div class="stat-card stat-posts">
						<div class="stat-value">{{ statistics.posts.total }}</div>
						<div class="stat-label">Postów</div>
					</div>
				</div>

				<div v-if="statistics.posts.topPostsByLikes && statistics.posts.topPostsByLikes.length" class="top-posts-section">
					<h4>Top posty (po likach)</h4>
					<ul class="posts-list">
						<li v-for="(post, idx) in statistics.posts.topPostsByLikes" :key="idx" class="post-item">
							<small class="post-meta">{{ post.author }} • {{ post.likes }} ❤️</small><br/>
							{{ post.content }}
						</li>
					</ul>
				</div>

				<div v-if="statistics.analytics && statistics.analytics.usersByRole && statistics.analytics.usersByRole.length" class="roles-section">
					<h4>Użytkownicy po rolach</h4>
					<div class="roles-grid">
						<div v-for="role in statistics.analytics.usersByRole" :key="role._id" class="role-card">
							<strong>{{ role._id || 'user' }}</strong>: {{ role.count }}
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="chat-section">
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

.users-management {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.users-list h4 {
	margin-top: 0;
	margin-bottom: 0.5rem;
	color: #333;
}

.user-items {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	max-height: 500px;
	overflow-y: auto;
	border: 1px solid #e0e0e0;
	border-radius: 4px;
	padding: 0.5rem;
}

.user-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0.75rem;
	background: #f9f9f9;
	border-radius: 4px;
	border-left: 3px solid #007bff;
}

.user-item:hover {
	background: #f0f8ff;
}

.user-info {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.user-info strong {
	min-width: 150px;
}

.user-info small {
	color: #666;
	flex: 1;
}

.blocked-badge {
	display: inline-block;
	background: #ffe6e6;
	color: #c82333;
	padding: 0.25rem 0.5rem;
	border-radius: 3px;
	font-size: 0.85em;
	font-weight: 500;
}

.pending-badge {
	display: inline-block;
	background: #fff3cd;
	color: #856404;
	padding: 0.25rem 0.5rem;
	border-radius: 3px;
	font-size: 0.85em;
	font-weight: 500;
}

.user-actions {
	display: flex;
	gap: 0.5rem;
}

.btn-block {
	padding: 0.5rem 0.75rem;
	background: #dc3545;
	color: white;
	border: none;
	border-radius: 3px;
	cursor: pointer;
	font-weight: 500;
	font-size: 0.9em;
	transition: background 0.2s;
}

.btn-block:hover {
	background: #c82333;
}

.btn-unblock {
	padding: 0.5rem 0.75rem;
	background: #28a745;
	color: white;
	border: none;
	border-radius: 3px;
	cursor: pointer;
	font-weight: 500;
	font-size: 0.9em;
	transition: background 0.2s;
}

.btn-unblock:hover {
	background: #218838;
}
</style>